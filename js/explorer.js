import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  enableIndexedDbPersistence,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* ================= FIREBASE ================= */
const app = initializeApp({
  apiKey: "AIzaSy...",
  authDomain: "cbc-business.firebaseapp.com",
  projectId: "cbc-business"
});

const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(()=>{});

/* ================= DOM ================= */
const cardsContainer = document.getElementById("cardsContainer");
const urgentBox = document.getElementById("urgentBox");
const noResults = document.getElementById("noResults");

/* ================= STATE ================= */
let currentPage = 1;
let urgentPage = 1;
let openedCard = null;

const perPage = 8;
const urgentPerPage = 5;

let verifiedMap = {};
let cachedData = [];

/* ================= URL PARAMS ================= */
const params = new URLSearchParams(window.location.search);

const paramUser = params.get("userID");
const paramBoost = params.get("boost") === "1";
const paramUrgent = params.get("urgence") === "1";

/* ================= SAFE CLICK ================= */
const clickMemory = new Set();

async function safeClick(id){
  if(clickMemory.has(id)) return;

  clickMemory.add(id);
  setTimeout(()=> clickMemory.delete(id), 10000);

  try{
    await updateDoc(doc(db,"annonces",id),{
      clicks: increment(1)
    });
  }catch(e){}
}

/* ================= FETCH ================= */
async function fetchAnnonces(){
  const q = query(
    collection(db,"annonces"),
    where("etat","==","actif"),
    orderBy("date_creation","desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({id:d.id,...d.data()}));
}

/* ================= USERS ================= */
async function fetchUsersVerified(ids){
  verifiedMap = {};
  const unique = [...new Set(ids)];

  while(unique.length){
    const chunk = unique.splice(0,10);

    const q = query(collection(db,"users"), where("userID","in",chunk));
    const snap = await getDocs(q);

    snap.forEach(d=>{
      const u = d.data();
      verifiedMap[u.userID] = {
  verified: !!u.verified,
  type: u.type || null
};
    });
  }
}

/* ================= SCORE ================= */
function computeScore(a){
  const now = Date.now();
  const created = a.date_creation?.toMillis?.() || now;
  const ageHours = (now - created) / 3600000;

  // ===== NORMALISATION (anti-explosion) =====
  const views = Math.log1p(a.views || 0);
  const clicks = Math.log1p(a.clicks || 0);
  const commands = Math.log1p(a.commands || 0);

  // ===== ENGAGEMENT (qualité réelle) =====
  const ctr = (a.views ? (a.clicks || 0) / a.views : 0); // click rate
  const conversion = (a.clicks ? (a.commands || 0) / a.clicks : 0); // conversion rate

  const engagement =
    (ctr * 40) +        // intérêt
    (conversion * 80);  // valeur business (plus fort)

  // ===== SCORE DE BASE =====
  let base =
    views * 2 +
    clicks * 3 +
    commands * 6 +
    engagement;

  // ===== BOOSTS (contrôlés, pas abusifs) =====
  if(a.boost) base *= 1.4;
  if(a.urgence) base *= 1.25;
  if(verifiedMap[a.userID]) base *= 1.15;

  // ===== DECAY INTELLIGENT (lent comme YouTube) =====
  const decay = 1 / (1 + ageHours / 48); 
  // lent → reste visible longtemps si performant

  // ===== FRESHNESS BONUS (nouveaux contenus) =====
  const freshnessBoost = ageHours < 24 ? 1.2 : 1;

  return base * decay * freshnessBoost;
}

/* ================= MULTI ================= */
function getMulti(id){
  const el = document.getElementById(id);
  if(!el) return [];
  return [...el.selectedOptions].map(o=>o.value);
}

/* ================= FILTER ================= */
function applyFilters(list){

  const search = document.getElementById("search")?.value.toLowerCase() || "";
  const categorie = document.getElementById("categorie")?.value;
  const licence = document.getElementById("licence")?.value;

  const provinces = getMulti("province");
  const villes = getMulti("ville");
  const type = document.getElementById("userType")?.value;

  const boostOnly = document.getElementById("boostOnly")?.checked;
  const urgentOnly = document.getElementById("urgentOnly")?.checked;

  return list.filter(a=>{

    /* 🔥 URL PRIORITY */
    if(paramUser && a.userID !== paramUser) return false;
    if(paramBoost && !a.boost) return false;
    if(paramUrgent && !a.urgence) return false;

    /* AREA */
    if(provinces.length && !provinces.some(p => (a.area?.provinces||[]).includes(p))) return false;
    if(villes.length && !villes.some(v => (a.area?.villes||[]).includes(v))) return false;

    /* NORMAL FILTER */
    if(categorie && a.categorie !== categorie) return false;
    if(licence && a.licence !== licence) return false;
    if(type && verifiedMap[a.userID]?.type !== type) return false;
    if(boostOnly && !a.boost) return false;
    if(urgentOnly && !a.urgence) return false;

    /* SEARCH */
    if(search){
      const txt = `
        ${a.titre}
        ${a.description}
        ${(a.area?.villes||[]).join(" ")}
        ${(a.area?.provinces||[]).join(" ")}
        ${(a.tags||[]).join(" ")}
      `.toLowerCase();

      if(!txt.includes(search)) return false;
    }

    return true;
  });
}

/* ================= SORT ================= */
function sortData(list){
  return list.sort((a,b)=>computeScore(b)-computeScore(a));
}

/* ================= BOOST CONTROL supprimé ================= */


/* ================= CARD ================= */
function createCard(a){

  const card = document.createElement("div");
  card.className = "card";

  const verified = verifiedMap[a.userID];

  card.innerHTML = `
    <div class="card-top">
      <div class="owner">
        <img class="avatar" src="${a.owner?.photoURL || 'default.png'}">
        <div class="title-block">
          <div class="title">${a.titre}</div>
          <div class="meta">${a.categorie || "-"} • Score ${computeScore(a).toFixed(1)}</div>
        </div>
      </div>

      <div class="badges">
        ${a.boost ? `<span class="badge boost">⭐</span>` : ""}
        ${a.urgence ? `<span class="badge urgent">🔴</span>` : ""}
        ${verified ? `<span class="badge verified">🔰</span>` : ""}
      </div>
    </div>

    <div>${a.pitch || ""}</div>

    <button class="toggle-more">+</button>

    <div class="extra hidden">
      <div class="budget">
        💰 ${a.salaire ? a.salaire+" $" : "-"}
      </div>
      <div class="pitch">${a.description || ""}</div>
      <div class="area">
       <strong>provinces cibles :</strong> ${(a.area?.provinces||[]).join(", ")} / <br> <strong>villes :</strong> ${(a.area?.villes||[]).join(", ")}
      </div>
      <div class="stats">
        👁 ${a.views||0} | 🖱 ${a.clicks||0} | 📦 ${a.commands||0}
      </div>
      <button class="action-btn" onclick="window.location.href='annonce.html?id=${a.id}'">Voir Plus</button>
    </div>
  `;

  const btn = card.querySelector(".toggle-more");
  const extra = card.querySelector(".extra");

  btn.onclick = ()=>{
  if(openedCard && openedCard !== extra){
    openedCard.classList.add("hidden");
    const prevBtn = openedCard.parentElement.querySelector(".toggle-more");
    if(prevBtn) prevBtn.textContent = "+";
  }

  const isOpen = extra.classList.toggle("hidden");
  btn.textContent = isOpen ? "+" : "-";

  openedCard = isOpen ? null : extra;
};

  card.addEventListener("click", (e)=>{
  if(
  e.target.closest(".toggle-more") ||
  e.target.closest(".action-btn") ||
  e.target.closest("a")
) return;
  safeClick(a.id);
});
  return card;
}

/* ================= FEED ================= */
function renderFeed(list){

  const base = list;
  const boosted = base;

  const start = (currentPage-1)*perPage;
  const items = boosted.slice(start,start+perPage);

  cardsContainer.innerHTML = "";

  if(!items.length){
    noResults.style.display="block";
    return;
  }

  noResults.style.display="none";

  items.forEach(a=>{
    cardsContainer.appendChild(createCard(a));
  });

  renderPagination(boosted.length);
}

/* ================= URGENT ================= */
function renderUrgent(list){

  const urgents = list.filter(a=>a.urgence);

  urgentBox.innerHTML = "<h4>🔥 Urgentes</h4>";

  if(!urgents.length){
    urgentBox.innerHTML = `
    <h4>🔥 Urgentes</h4>
  <p>aucune annonce urgente pour le moment</p>
`;
return;
  }

  const start = (urgentPage-1)*urgentPerPage;
  const items = urgents.slice(start,start+urgentPerPage);

  items.forEach(a=>{
    const card = document.createElement("div");
    card.className = "urgent-card";

    card.innerHTML = `
      <img src="${a.owner?.photoURL || 'default.png'}">
      <div class="urgent-content">
        <strong>${a.titre}</strong>
        <div>${a.pitch || ""}</div>
      </div>
      <button class="toggle-more">+</button>

    <div class="extra hidden">
    <div class="budget">
        💰 ${a.salaire ? a.salaire+" $" : "-"}
      </div>
      <div class="pitch-urgence">${a.description || ""}</div>
      <div class="stats">
        👁 ${a.views||0} | 🖱 ${a.clicks||0} | 📦 ${a.commands||0}
      </div>
      <button class="action-btn" onclick="window.location.href='annonce.html?id=${a.id}'">Voir Plus</button>
    </div>
    `;

    const btn = card.querySelector(".toggle-more");
  const extra = card.querySelector(".extra");

  btn.onclick = ()=>{
  if(openedCard && openedCard !== extra){
    openedCard.classList.add("hidden");
    const prevBtn = openedCard.parentElement.querySelector(".toggle-more");
    if(prevBtn) prevBtn.textContent = "+";
  }

  const isOpen = extra.classList.toggle("hidden");
  btn.textContent = isOpen ? "+" : "-";

  openedCard = isOpen ? null : extra;
};

    urgentBox.appendChild(card);
  });
  

  renderUrgentPagination(urgents.length);
}

/* ================= PAGINATION ================= */
function renderPagination(total){
  const container = document.getElementById("pagination");
  container.innerHTML="";

  const pages = Math.ceil(total/perPage);

  for(let i=1;i<=pages;i++){
    const b=document.createElement("button");
    b.textContent=i;
    if(i===currentPage) b.classList.add("active");

    b.onclick=()=>{
      currentPage=i;
      load();
    };

    container.appendChild(b);
  }
}

function renderUrgentPagination(total){
  const container = document.getElementById("urgentPagination");
  if(!container) return;

  container.innerHTML="";

  const pages = Math.ceil(total/urgentPerPage);

  for(let i=1;i<=pages;i++){
    const b=document.createElement("button");
    b.textContent=i;

    if(i===urgentPage) b.classList.add("active");

    b.onclick=()=>{
      urgentPage=i;
      load();
    };

    container.appendChild(b);
  }
}

/* ================= LOAD ================= */
async function load(){

  const data = cachedData.length ? cachedData : await fetchAnnonces();
  cachedData = data;

  await fetchUsersVerified(data.map(d=>d.userID));

  let filtered = applyFilters(data);
  filtered = sortData(filtered);

  renderFeed(filtered);
  renderUrgent(data);
}

/* ================= EVENTS ================= */
document.getElementById("applyFilters").onclick=()=>{
  currentPage=1;
  urgentPage=1;
  load();
};

document.getElementById("searchBtn").onclick=()=>{
  currentPage=1;
  load();
};

/* ================= INIT ================= */
load();