import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* -------------------- FIREBASE -------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyBla3D7OS8-Hx82m8Tz6ZPIS7FSLury3ew",
  authDomain: "cbc-business.firebaseapp.com",
  projectId: "cbc-business",
  storageBucket: "cbc-business.firebasestorage.app",
  messagingSenderId: "295952883135",
  appId: "1:295952883135:web:4624174a452c1f6aad950a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* -------------------- OFFLINE -------------------- */
enableIndexedDbPersistence(db).catch(() => {});

/* -------------------- DOM -------------------- */
const cardsContainer = document.getElementById("cardsContainer");
const noResults = document.getElementById("noResults");
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("searchBtn");
const categorieSelect = document.getElementById("categorie");
const provinceSelect = document.getElementById("province");
const licenceSelect = document.getElementById("licence");
const applyFiltersBtn = document.getElementById("applyFilters");

/* -------------------- PAGINATION -------------------- */
let currentPage = 1;
const perPage = 12; // affichage par page

/* -------------------- DATA -------------------- */
let verifiedMap = {};

/* -------------------- UTILS -------------------- */
function getURLParams() {
  return new URLSearchParams(window.location.search);
}

/* -------------------- FIRESTORE -------------------- */
async function fetchAnnonces() {
  const q = query(
    collection(db, "annonces"),
    where("etat", "==", "actif"),
    orderBy("date_creation", "desc") // ✅ CORRIGÉ
  );

  const snap = await getDocs(q);

  const data = [];
  snap.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
  return data;
}

async function fetchUsersVerified(userIDs) {
  verifiedMap = {};
  if (!userIDs.length) return;

  const chunks = [];
  while (userIDs.length) chunks.push(userIDs.splice(0, 10));

  for (const chunk of chunks) {
    const q = query(collection(db, "users"), where("userID", "in", chunk));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      const u = doc.data();
      verifiedMap[u.userID] = u.verified === true;
    });
  }
}

/* -------------------- SCORE & TRI -------------------- */
function computeScore(a) {
  const now = Date.now();
  const createdAt = a.date_creation?.toMillis?.() || now; // ✅ CORRIGÉ

  const ageHours = (now - createdAt) / (1000 * 60 * 60);
  const freshnessBoost = Math.max(0, 100 - ageHours);

  return (
    (a.views || 0) * 1 +
    (a.clicks || 0) * 3 +
    (a.commands || 0) * 5 +
    (a.boost ? 50 : 0) +
    (a.urgence ? 80 : 0) +
    (verifiedMap[a.userID] ? 20 : 0) +
    freshnessBoost
  );
}

function sortAnnonces(annonces) {
  return annonces.sort((a, b) => computeScore(b) - computeScore(a));
}

/* -------------------- FILTERS -------------------- */
function applyFilters(annonces) {
  const params = getURLParams();
  const userParam = params.get("user");

  const search = searchInput.value.trim().toLowerCase();
  const niche = document.getElementById("niche").value;
  const categorie = categorieSelect.value;
  const province = provinceSelect.value;
  const ville = document.getElementById("ville").value;
  const licence = licenceSelect.value;
  const boostOnly = document.getElementById("boostOnly").checked;
  const urgentOnly = document.getElementById("urgentOnly").checked;

  return annonces.filter(a => {
    if (userParam && a.userID !== userParam) return false;
    if (niche && a.niche !== niche) return false;
    if (categorie && a.categorie !== categorie) return false;
    if (province && a.province !== province) return false;
    if (ville && a.ville !== ville) return false;
    if (licence && a.licence !== licence) return false;
    if (boostOnly && !a.boost) return false;
    if (urgentOnly && !a.urgence) return false;

    if (search) {
      const txt = (
        (a.titre || "") + " " +
        (a.description || "") + " " +
        (a.categorie || "") + " " +
        (a.ville || "") + " " +
        (a.province || "") + " " +
        (a.niche || "") + " " +
        (a.tags || []).join(" ")
      ).toLowerCase();

      if (!txt.includes(search)) return false;
    }

    return true;
  });
}

/* -------------------- PAGINATION -------------------- */
function renderPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / perPage);
  const container = document.getElementById("pagination");
  container.innerHTML = "";

  const createBtn = (text, disabled, onClick, active=false) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = "page-btn";
    if (disabled) btn.classList.add("disabled");
    if (active) btn.classList.add("active");
    btn.onclick = onClick;
    return btn;
  };

  container.appendChild(createBtn("←", currentPage===1, () => { if (currentPage>1){ currentPage--; loadExplorer(); }}));
  for (let i = 1; i <= totalPages; i++) {
    container.appendChild(createBtn(i, false, () => { currentPage = i; loadExplorer(); }, i===currentPage));
  }
  container.appendChild(createBtn("→", currentPage===totalPages, () => { if (currentPage<totalPages){ currentPage++; loadExplorer(); }}));
}

/* -------------------- LAZY LOAD CARDS -------------------- */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("show");
  });
}, { threshold: 0.1 });

/* -------------------- RENDER ANNONCES -------------------- */
function renderAnnonces(annonces) {
  const mainContainer = document.getElementById("cardsContainer");
  const urgentSidebar = document.getElementById("urgentBox");

  mainContainer.innerHTML = "";
  if (urgentSidebar) urgentSidebar.innerHTML = `<h4>🔥 Urgentes</h4><p>Annonces urgentes</p>`;

  if (!annonces.length) { noResults.style.display = "block"; return; }
  noResults.style.display = "none";

  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  // ================= URGENTES =================
  if (urgentSidebar && !isMobile) {
    const urgentList = annonces.filter(a => a.urgence && !a.boost);
    urgentList.forEach(a => {
      const card = document.createElement("div");
      card.className = "card small-card";
      card.innerHTML = `
        <h4>${a.titre || "Sans titre"}</h4>
        <p>${a.categorie || "-"} • ${a.province || "-"}</p>
        <p>Score: ${computeScore(a)}</p>
        <p>👁 ${a.views || 0} | 🖱 ${a.clicks || 0}</p>
      `;
      const badges = document.createElement("div");
      badges.className = "badges";
      badges.innerHTML += `<span class="badge urgent">🔴 Urgent</span>`;
      if (verifiedMap[a.userID]) badges.innerHTML += `<span class="badge verified">🔰 Vérifié</span>`;
      card.appendChild(badges);
      card.addEventListener("click", async () => {
        await updateDoc(doc(db, "annonces", a.id), { clicks: increment(1) });
      });
      urgentSidebar.appendChild(card);
      observer.observe(card);
    });
  }

  // ================= FEED PRINCIPAL =================
  const feedList = isMobile ? annonces : annonces.filter(a => !a.urgence);
  feedList.forEach(a => {
    const repeat = a.boost && !isMobile ? 2 : 1;
    for (let i=0;i<repeat;i++) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${a.titre || "Sans titre"}</h3>
        <p>${a.pitch || ""}</p>
        <p>${a.categorie || "-"} • ${a.province || "-"}, ${a.ville || "-"}</p>
        <p>Score: ${computeScore(a)}</p>
        <p>👁 ${a.views || 0} | 🖱 ${a.clicks || 0} | 📦 ${a.commands || 0}</p>
      `;
      const badges = document.createElement("div");
      badges.className = "badges";
      if (a.urgence && isMobile) badges.innerHTML += `<span class="badge urgent">🔴 Urgent</span>`;
      if (a.boost) badges.innerHTML += `<span class="badge boost">⭐ Boost</span>`;
      if (verifiedMap[a.userID]) badges.innerHTML += `<span class="badge verified">🔰 Vérifié</span>`;
      card.appendChild(badges);

      const btn = document.createElement("button");
      btn.textContent = "Voir l’annonce";
      btn.addEventListener("click", e => {
        e.stopPropagation();
        updateDoc(doc(db, "annonces", a.id), { clicks: increment(1) });
        window.location.href = `annonce.html?id=${a.id}`;
      });

      card.addEventListener("click", async e => {
        if (e.target === btn) return;
        await updateDoc(doc(db, "annonces", a.id), { clicks: increment(1) });
      });

      card.appendChild(btn);
      mainContainer.appendChild(card);
      observer.observe(card);
    }
  });
}

/* -------------------- LOAD EXPLORER -------------------- */
async function loadExplorer() {
  const annonces = await fetchAnnonces();
  const userIDs = [...new Set(annonces.map(a => a.userID))];
  await fetchUsersVerified([...userIDs]);
  const filtered = applyFilters(annonces);
  const sorted = sortAnnonces(filtered);
  const start = (currentPage-1)*perPage;
  const end = start+perPage;
  renderAnnonces(sorted.slice(start,end));
  renderPagination(sorted.length);
}

/* -------------------- EVENTS -------------------- */
function attachFilterEvents() {
  applyFiltersBtn?.addEventListener("click", () => { currentPage=1; loadExplorer(); });
  searchBtn?.addEventListener("click", () => { currentPage=1; loadExplorer(); });
  searchInput?.addEventListener("keyup", e => { if(e.key==="Enter"){currentPage=1; loadExplorer();} });

  ["boostOnly","urgentOnly","niche","ville","categorie","province","licence"].forEach(id=>{
    const el = document.getElementById(id);
    el?.addEventListener("change",()=>{ currentPage=1; loadExplorer(); });
  });
}
attachFilterEvents();
loadExplorer();
