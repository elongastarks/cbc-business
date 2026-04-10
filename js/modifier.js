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
   DOM SAFE ACCESS (BY ID)
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

const statut = document.querySelector("select");

const viewsEl = $("views");
const clicksEl = $("clicks");
const commandsEl = $("commands");

const saveBtn = document.querySelector(".save-btn");
const btnActive = document.querySelector(".btn-active");
const btnPending = document.querySelector(".btn-pending");
const btnCommands = document.querySelector(".btn-commands");

const renduNote = document.querySelector(".danger textarea");
const renduUser = document.querySelector(".danger input");
const renduBtn = document.querySelector(".danger button");

const deleteBtn = document.querySelector(".danger.red button");

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
   LOAD ANNONCE
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
     FILL FORM
  ========================= */
  titre.value = annonce.titre || "";
  pitch.value = annonce.pitch || "";
  description.value = annonce.description || "";

  categorie.value = annonce.categorie || "";
  niche.value = annonce.niche || "";

  salaire.value = annonce.salaire || 0;
  lieu.value = annonce.lieu || "";
  licence.value = annonce.licence || "";
  pdf_url.value = annonce.pdf_url || "";

  statut.value = annonce.etat || "actif";

  /* =========================
     AREA LOGIC (cibles.js compatible)
  ========================= */
  if (window.getTargetingData) {
    const data = window.getTargetingData();

    // fallback safe
    province.value = (annonce.province || "").split(",")[0] || "";
    ville.value = (annonce.ville || "").split(",")[0] || "";
  }

  /* =========================
     STATS
  ========================= */
  viewsEl.textContent = annonce.views || 0;
  clicksEl.textContent = annonce.clicks || 0;
  commandsEl.textContent = annonce.commands || 0;

  /* =========================
     COMMAND LINK
  ========================= */
  btnCommands.onclick = () => {
    location.href = `commande.html?annonceID=${annonceID}`;
  };
}

/* =========================
   SAVE UPDATE (CLEAN + SAFE)
========================= */
saveBtn.onclick = async () => {
  if (!annonceID) return;

  const target = window.getTargetingData ? window.getTargetingData() : {
    provinces: [province.value],
    villes: [ville.value]
  };

  const updated = {
    titre: titre.value.trim(),
    pitch: pitch.value.trim(),
    description: description.value.trim(),

    categorie: categorie.value,
    niche: niche.value,

    salaire: Number(salaire.value || 0),

    province: target.provinces.join(","),
    ville: target.villes.join(","),

    lieu: lieu.value.trim(),
    licence: licence.value,

    pdf_url: pdf_url.value.trim(),

    etat: statut.value,

    updatedAt: serverTimestamp()
  };

  await updateDoc(doc(db, "annonces", annonceID), updated);

  alert("Annonce mise à jour");
};

/* =========================
   ACTIONS
========================= */
btnActive.onclick = async () => {
  await updateDoc(doc(db, "annonces", annonceID), { etat: "actif" });
  statut.value = "actif";
};

btnPending.onclick = async () => {
  await updateDoc(doc(db, "annonces", annonceID), { etat: "pending" });
  statut.value = "pending";
};

/* =========================
   RENDU SYSTEM (FIXED)
========================= */
renduBtn.onclick = async () => {
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
   DELETE SAFE
========================= */
deleteBtn.onclick = async () => {
  if (!confirm("Supprimer définitivement ?")) return;

  await deleteDoc(doc(db, "annonces", annonceID));

  alert("Supprimé");
  location.href = "dashboard.html";
};