
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, getDoc, orderBy, limit, doc, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// --- 🔹 Config Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyBla3D7OS8-Hx82m8Tz6ZPIS7FSLury3ew",
  authDomain: "cbc-business.firebaseapp.com",
  projectId: "cbc-business",
  storageBucket: "cbc-business.firebasestorage.app",
  messagingSenderId: "295952883135",
  appId: "1:295952883135:web:4624174a452c1f6aad950a",
  measurementId: "G-580W4D6J7E"
};

let app;
try { app = initializeApp(firebaseConfig); } catch(e){}

const db = getFirestore();
const auth = getAuth();

// Active le mode offline
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Probablement plusieurs onglets ouverts
      console.log("Offline persistence failed: plusieurs onglets ouverts");
      alert("Impossible d'activer le mode offline : plusieurs onglets ouverts.");
    } else if (err.code === 'unimplemented') {
      // Navigateur ne supporte pas IndexedDB
      console.log("Offline persistence n'est pas supporté par ce navigateur");
      alert("Le mode offline n'est pas supporté par votre navigateur.");
    }
  });

// ------------------ ALERTES ------------------
async function loadAlert(){
  const alertBox = document.getElementById('site-alert');
  if(!alertBox) return;

  try {
    const qAlerts = query(
      collection(db,"alerts"),
      where("active","==",true),
      orderBy("timestamp","desc"),
      limit(1)
    );
    const snap = await getDocs(qAlerts);
    if(snap.empty){ alertBox.style.display="none"; return; }

    const a = snap.docs[0].data();
    alertBox.classList.add(a.type || "info");
    alertBox.textContent = a.message;
    alertBox.style.display="flex";
  } catch(err){
    console.error("Erreur chargement alertes:", err);
  }
}
loadAlert();




async function fetchStats() {
  // 1. Nombre de freelances inscrits (type="personnel" ou "entreprise")
  const usersSnap = await getDocs(collection(db, "users"));
  const usersCount = usersSnap.size;

  // 2. Nombre de missions publiées
  const annoncesSnap = await getDocs(collection(db, "annonces"));
  const jobsCount = annoncesSnap.size;

  // 3. Nombre de services rendus
  const rendusSnap = await getDocs(collection(db, "rendus"));
  const completedCount = rendusSnap.size;

  // 4. Nombre de villes uniques couvertes
  const citiesSet = new Set();
  usersSnap.forEach(doc => {
    const data = doc.data();
    if(data.ville) citiesSet.add(data.ville);
  });
  const citiesCount = citiesSet.size;

  // Lancer animation compteur
  animateCount("stat-users", usersCount);
  animateCount("stat-jobs", jobsCount);
  animateCount("stat-completed", completedCount);
  animateCount("stat-cities", citiesCount);
}

// Fonction compteur animé
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let count = 0;
  const duration = 1500;
  const stepTime = Math.max(Math.floor(duration / target), 20);

  const interval = setInterval(() => {
    count++;
    el.textContent = count + (target >= 100 ? "+" : "");
    if(count >= target) clearInterval(interval);
  }, stepTime);
}

// Lancer quand page chargée
fetchStats();

// ------------------ CTA FLOATING ------------------
const ctaContainer = document.getElementById("floatingCTA");
const ctaStatic = `<a href="/explorer.html" class="cta static">Explorer les annonces</a>`;

// Fonction pour générer le CTA dynamique
async function generateCTA(user) {
  if (!ctaContainer) return;

  let ctaHTML = "";

  try {
    if (!user) {
      // Utilisateur non connecté
      ctaHTML = `<a href="/signup.html" class="cta dynamic">Créer un compte</a>`;
    } else {
      // Utilisateur connecté : vérifier si déjà une annonce
      const annoncesRef = collection(db, "annonces");
      const q = query(annoncesRef, where("userID", "==", user.uid), limit(1));
      const snap = await getDocs(q);

      if (snap.empty) {
        ctaHTML = `<a href="/poster.html" class="cta dynamic">Poster une annonce</a>`;
      } else {
        ctaHTML = `<a href="/dashboard.html" class="cta dynamic">Accéder au dashboard</a>`;
      }
    }
  } catch (err) {
    console.error("Erreur chargement CTA :", err);
    // Fallback sécurisé
    ctaHTML = `<a href="/signup.html" class="cta dynamic">Créer un compte</a>`;
  }

  ctaContainer.classList.add("floating");
  ctaContainer.innerHTML = ctaHTML + ctaStatic;
}

// Fonction pour détecter si le CTA doit disparaître
function handleCTAVisibility() {
  if (!ctaContainer) return;

  // Sélecteurs où le CTA doit disparaître
  const hiddenSelectors = [".final-cta", "footer", ".hero"];
  let hideCTA = false;

  for (const sel of hiddenSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        hideCTA = true;
        break;
      }
    }
  }

  ctaContainer.style.display = hideCTA ? "none" : "flex";
}

// Écoute l'état de l'utilisateur
onAuthStateChanged(auth, (user) => {
  generateCTA(user);
  handleCTAVisibility(); // Vérifie immédiatement
});

// Événements scroll + resize pour cacher/réafficher le CTA
window.addEventListener("scroll", handleCTAVisibility);
window.addEventListener("resize", handleCTAVisibility);

// ------------------ BOOSTED / FEATURED ANNOUNCES ------------------
async function loadFeatured(){
  const list = document.getElementById("featured-list");
  if(!list) return;

  try {
    const qB = query(
      collection(db, "annonces"),
      where("boost", "==", true),
      orderBy("date_creation", "desc"),
      limit(3)
    );

    const snap = await getDocs(qB);
    list.innerHTML = "";

    if(snap.empty){
      list.innerHTML = "<p>Aucune annonce boostée pour le moment.</p>";
      return;
    }

    snap.forEach(docSnap=>{
      const d = docSnap.data();
      const titre = d.titre || "Annonce";
      const categorie = d.categorie || "Sans catégorie";

      list.innerHTML += `
        <div class="card">
          <h3>${titre}</h3>
          <small>${categorie}</small><br>
          <a class="contact-btn" href="explore?id=${docSnap.id}">Contacter</a>
        </div>
      `;
    });

  } catch(err){
    console.error("Erreur lors du chargement des annonces boostées :", err);
    list.innerHTML = "<p>Impossible de charger les annonces en vedette.</p>";
  }
}
loadFeatured();

// ------------------ MISSIONS RENDUES ------------------
async function loadRendus(){
  const list = document.getElementById("rendus-list");
  if(!list) return;

  try {
    const qR = query(
      collection(db,"rendus"),
      orderBy("date_rendu","desc"),
      limit(5)
    );
    const snap = await getDocs(qR);
    list.innerHTML = "";

    snap.forEach(docSnap=>{
      const d = docSnap.data();
      list.innerHTML += `
        <div class="rendu-item">
          <strong>${d.titre || "Mission rendue"}</strong><br>
          <small>${d.categorie || ""}</small>
        </div>
      `;
    });

  } catch(err){
    console.error("Erreur chargement missions rendues :", err);
    list.innerHTML = "<p>Impossible de charger les missions rendues.</p>";
  }
}
loadRendus();

// ------------------ CATÉGORIES POPULAIRES ------------------
async function loadCategories(){
  const list = document.getElementById("categories");
  if(!list) return;
  list.innerHTML = "";

  try {
    const snap = await getDocs(collection(db,"annonces"));
    const counter = {};

    snap.forEach(docSnap=>{
      const d = docSnap.data();
      if(!d.categorie) return;
      counter[d.categorie] = (counter[d.categorie] || 0) + 1;
    });

    const sorted = Object.entries(counter)
                  .sort((a,b)=>b[1]-a[1])
                  .slice(0,10);

    sorted.forEach(([cat])=>{
      const div = document.createElement("div");
      div.className = "cat-card";
      div.textContent = cat;
      list.appendChild(div);
    });

  } catch(err){
    console.error("Erreur chargement catégories :", err);
  }
}
loadCategories();

// ------------------ TÉMOIGNAGES ------------------
async function loadTestimonials() {
  const list = document.getElementById("testimonials");
  if(!list) return;

  try {
    const qT = query(
      collection(db, "comments"),
      where("status", "==", "approved"),
      orderBy("timestamp","desc"),
      limit(5)
    );
    const snap = await getDocs(qT);
    list.innerHTML = "";

    for(const docSnap of snap.docs){
      const d = docSnap.data();
      let name = d.name || "Utilisateur";
      let photoURL = null;

      if(d.userID && d.userID !== "anonymous"){
        try {
          const userRef = doc(db,"users",d.userID);
          const userSnap = await getDoc(userRef);
          if(userSnap.exists()){
            const userData = userSnap.data();
            if(userData.name) name = userData.name;
            if(userData.photoURL) photoURL = userData.photoURL;
          }
        } catch(err){
          console.warn("Erreur récupération user :", err);
        }
      }

      if(!photoURL) photoURL = generateAvatar(name);

      const rating = d.rating || 0;
      let starsHTML = "";
      for(let i=1;i<=5;i++){
        starsHTML += `<span style="color:${i<=rating?"#f5b301":"#ccc"}; font-size:16px;">★</span>`;
      }

      list.innerHTML += `
        <div class="t-item" style="margin-bottom:20px">
          <div class="t-item-header" style="display:flex;align-items:center;gap:12px">
            <img src="${photoURL}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" alt="${name}">
            <div>
              <strong>${name}</strong>
              <div>${starsHTML}</div>
            </div>
          </div>
          <p style="margin-top:8px">${d.comment || ""}</p>
        </div>
      `;
    }

  } catch(err){
    console.error("Erreur témoignages :", err);
    list.innerHTML = "<p>Impossible de charger les témoignages.</p>";
  }
}
loadTestimonials();

// ------------------ AVATAR GENERATOR ------------------
function generateAvatar(name){
  const initial = (name && name.charAt(0).toUpperCase()) || "U";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">
      <rect width="100%" height="100%" fill="#0B5FFF"/>
      <text x="50%" y="50%" dy=".35em"
            text-anchor="middle"
            fill="#FFFFFF"
            font-size="20"
            font-family="Arial"
            font-weight="bold">${initial}</text>
    </svg>
  `;
  return "data:image/svg+xml;base64," + btoa(svg);
}

// ------------------ SEARCH ------------------
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");

function doSearch(){
  const q = searchInput?.value.trim();
  if(q && q.length>0){
    window.location.href = `explorer?q=${encodeURIComponent(q)}`;
  }
}

searchBtn?.addEventListener("click", doSearch);
searchInput?.addEventListener("keypress",(e)=>{ if(e.key==="Enter") doSearch(); });
