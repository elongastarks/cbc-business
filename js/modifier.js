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

  categorie.value = annonce.categorie ?? "";
  niche.value = annonce.niche ?? "";

  salaire.value = annonce.salaire ?? 0;
  lieu.value = annonce.lieu ?? "";
  licence.value = annonce.licence ?? "";
  pdf_url.value = annonce.pdf_url ?? "";

  statut.value = annonce.etat ?? "actif";

  /* =========================
     AREA SYNC (cibles.js MASTER)
  ========================= */
  setTimeout(() => {
    if (!window.getTargetingData) return;

    const area = window.getTargetingData();

    // reset sets via UI simulation
    Array.from(province.options).forEach(o => {
      o.selected = (annonce.provinces || []).includes(o.value);
    });

    province.dispatchEvent(new Event("change"));

    setTimeout(() => {
      Array.from(ville.options).forEach(o => {
        o.selected = (annonce.villes || []).includes(o.value);
      });
    }, 150);
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

  const area = window.getTargetingData ? window.getTargetingData() : {
    provinces: annonce.provinces || [],
    villes: annonce.villes || []
  };

  const updated = {
    ...annonce,

    titre: titre.value.trim() || annonce.titre,
    pitch: pitch.value.trim() || annonce.pitch,
    description: description.value.trim() || annonce.description,

    categorie: categorie.value || annonce.categorie,
    niche: niche.value || annonce.niche,

    salaire: salaire.value !== "" ? Number(salaire.value) : annonce.salaire,

    provinces: area.provinces,
    villes: area.villes,

    lieu: lieu.value.trim() || annonce.lieu,
    licence: licence.value || annonce.licence,

    pdf_url: pdf_url.value.trim() || annonce.pdf_url,

    etat: statut.value || annonce.etat,

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
   RENDU
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
   DELETE
========================= */
deleteBtn.onclick = async () => {
  if (!confirm("Supprimer définitivement ?")) return;

  await deleteDoc(doc(db, "annonces", annonceID));

  alert("Supprimé");
  location.href = "dashboard.html";
};
