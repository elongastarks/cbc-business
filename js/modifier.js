// MODIFIER.js version finale, propre

/* =========================
   FIREBASE IMPORTS CLEAN
========================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* =========================
   CONFIG
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyBla3D7OS8-Hx82m8Tz6ZPIS7FSLury3ew",
  authDomain: "cbc-business.firebaseapp.com",
  projectId: "cbc-business"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   PARAMS
========================= */
const annonceID = new URLSearchParams(window.location.search).get("annonceID");

/* =========================
   DOM
========================= */
const $ = (id) => document.getElementById(id);

const titre = $("titre");
const pitch = $("pitch");
const description = $("description");
const categorie = $("categorie");
const niche = $("niche");

const salaire = $("salaire");
const ville = $("ville");
const province = $("province");
const lieu = $("lieu");
const licence = $("licence");
const pdf_url = $("pdf_url");

const statut = $("status");

const viewsEl = $("views");
const clicksEl = $("clicks");
const commandsEl = $("commands");

const saveBtn = document.querySelector(".save-btn");
const btnActive = document.querySelector(".btn-active");
const btnPending = document.querySelector(".btn-pending");
const btnCommands = document.querySelector(".btn-commands");

const renduNote = $("rendu_note");
const renduUser = $("rendu_user");
const deleteBtn = $("delete_btn");
const renduBtn = document.querySelector(".btn-rendu");

/* =========================
   STATE
========================= */
let currentUser = null;
let annonce = null;

/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  await loadAnnonce();
});

/* =========================
   LOAD
========================= */
async function loadAnnonce() {
  if (!annonceID) {
    alert("Annonce introuvable");
    location.href = "dashboard.html";
    return;
  }

  const ref = doc(db, "annonces", annonceID);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("Annonce introuvable");
    location.href = "dashboard.html";
    return;
  }

  annonce = snap.data();

  if (annonce.userID !== currentUser.uid) {
    alert("Accès refusé");
    location.href = "dashboard.html";
    return;
  }

  /* =========================
     PRE-FILL (SOURCE OF TRUTH)
  ========================= */
  titre.value = annonce.titre ?? "";
  pitch.value = annonce.pitch ?? "";
  description.value = annonce.description ?? "";

  setTimeout(() => {
  categorie.value = annonce.categorie ?? "";
  niche.value = annonce.niche ?? "";
}, 200);

  salaire.value = annonce.salaire ?? 0;
  lieu.value = annonce.lieu ?? "";
  licence.value = annonce.licence ?? "";
  pdf_url.value = annonce.pdf_url ?? "";

  statut.textContent = annonce.etat ?? "actif";

  /* =========================
     AREA SYNC (cibles.js MASTER)
  ========================= */
  setTimeout(() => {
    if (!window.getTargetingData) return;

    const area = window.getTargetingData();

    // reset sets via UI simulation
    if (province?.options && ville?.options) {
  Array.from(province.options).forEach(o => {
    o.selected = (annonce.area?.provinces || []).includes(o.value);
  });

  province.dispatchEvent(new Event("change"));

  setTimeout(() => {
    Array.from(ville.options).forEach(o => {
      o.selected = (annonce.area?.villes || []).includes(o.value);
    });
  }, 150);
}
  
  }, 200);

  /* =========================
     STATS
  ========================= */
  viewsEl.textContent = annonce.views || 0;
  clicksEl.textContent = annonce.clicks || 0;
  commandsEl.textContent = annonce.commands || 0;

  btnCommands.onclick = () => {
    location.href = `commande.html?annonceID=${annonceID}`;
  };
}

/* =========================
   SAVE (NO DATA LOSS VERSION)
========================= */
saveBtn.onclick = async () => {
  if (!annonce) return;

  const area = window.getTargetingData?.() || {
  provinces: annonce.area?.provinces || [],
  villes: annonce.area?.villes || []
};

  const updated = {
  ...annonce,

  titre: titre.value.trim() || annonce.titre,
  pitch: pitch.value.trim() || annonce.pitch,
  description: description.value.trim() || annonce.description,

  categorie: categorie.value || annonce.categorie,
  niche: niche.value || annonce.niche,

  salaire: salaire.value !== "" ? Number(salaire.value) : annonce.salaire,

  area: {
    provinces: area.provinces?.length ? area.provinces : (annonce.area?.provinces || []),
    villes: area.villes?.length ? area.villes : (annonce.area?.villes || [])
  },

  lieu: lieu.value.trim() || annonce.lieu,
  licence: licence.value || annonce.licence,

  pdf_url: pdf_url.value.trim() || annonce.pdf_url,

  etat: annonce.etat,

  updatedAt: serverTimestamp()
};

  await updateDoc(doc(db, "annonces", annonceID), updated);
  alert("Annonce mise à jour");
  location.href = "dashboard.html";
};

/* =========================
   ACTIONS
========================= */
btnActive?.addEventListener("click", async () => {
  await updateDoc(doc(db, "annonces", annonceID), { etat: "actif" });

  annonce.etat = "actif";              // 🔥 sync mémoire
  statut.textContent = "actif";        // 🔥 UI correct
};

btnPending?.addEventListener("click", async () => {
  await updateDoc(doc(db, "annonces", annonceID), { etat: "pending" });

  annonce.etat = "pending";
  statut.textContent = "pending";
};


/* =========================
   RENDU
========================= */
renduBtn?.addEventListener("click", async () => {
  const note = renduNote.value.trim();
  const forID = renduUser.value.trim();

  if (!note || !forID) {
    alert("Champs manquants");
    return;
  }

  const q = query(collection(db, "users"), where("userID", "==", forID));
  const snap = await getDocs(q);

  if (snap.empty) {
    alert("Utilisateur introuvable");
    return;
  }

  await updateDoc(doc(db, "annonces", annonceID), {
    etat: "rendu"
  });

  await addDoc(collection(db, "rendus"), {
    annonceID,
    byID: currentUser.uid,
    forID,
    note,
    titre: annonce.titre,
    categorie: annonce.categorie,
    date_rendu: serverTimestamp()
  });

  alert("Rendu validé");
};

/* =========================
   DELETE
========================= */
deleteBtn.onclick = async () => {
  if (!confirm("Supprimer définitivement ?")) return;

  await deleteDoc(doc(db, "annonces", annonceID));

  alert("Supprimé");
  location.href = "dashboard.html";
};
