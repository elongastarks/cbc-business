import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* ================= CONFIG ================= */
const firebaseConfig = {
  apiKey: "AIzaSyBla3D7OS8-Hx82m8Tz6ZPIS7FSLury3ew",
  authDomain: "cbc-business.firebaseapp.com",
  projectId: "cbc-business",
  storageBucket: "cbc-business.firebasestorage.app",
  messagingSenderId: "295952883135",
  appId: "1:295952883135:web:4624174a452c1f6aad950a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ================= ALERT ================= */
const alertBox = document.getElementById("alertBox");

function showAlert(type, msg) {
  alertBox.className = "alert " + type;
  alertBox.textContent = msg;
  alertBox.style.display = "block";
}

/* ================= DATE ================= */
function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

/* ================= SUBSCRIPTION ================= */
function hasActiveSubscription(abonnements = []) {
  const now = new Date();
  return abonnements.some(a => a?.expires && new Date(a.expires) > now);
}

/* ================= USER CACHE ================= */
let currentUserData = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showAlert("error", "Connexion requise.");
    return;
  }

  const q = query(collection(db, "users"), where("userID", "==", user.uid));
  const snap = await getDocs(q);

  if (snap.empty) {
    showAlert("error", "Utilisateur introuvable.");
    return;
  }

  currentUserData = snap.docs[0].data();
});

/* ================= POST ANNONCE ================= */
document.getElementById("postBtn").addEventListener("click", async () => {
  alertBox.style.display = "none";

  const user = auth.currentUser;
  if (!user || !currentUserData) return;

  const titre = document.getElementById("titre").value.trim();
  const pitch = document.getElementById("pitch").value.trim();
  const description = document.getElementById("description").value.trim();
  const categorie = document.getElementById("categorie").value;

  if (!titre || !pitch || !description || !categorie) {
    return showAlert("error", "Champs obligatoires manquants.");
  }

  const tags = (document.getElementById("tags").value || "")
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);

  /* ================= AREA SYSTEM (IMPORTANT FUTUR) =================
     cibles.js doit fournir :
     - provinces: []
     - villes: []
  */
  let area = window.getTargetingData ? window.getTargetingData() : null;

  const annonceData = {
    userID: user.uid,
    titre,
    pitch,
    description,
    categorie,
    tags,

    /* ================= LOCALISATION ================= */
    area: area || {
      provinces: [],
      villes: []
    },

    lieu: document.getElementById("lieu")?.value || "",
    licence: document.getElementById("licence")?.value || "",
    salaire: Number(document.getElementById("salaire")?.value || 0),
    pdf_url: document.getElementById("pdf_url")?.value || "",

    etat: "actif",
    urgence: false,
    boost: currentUserData.boost === true,

    views: 0,
    clicks: 0,
    commands: 0,
    republis: 0,

    verified: !!currentUserData.verified,
    date_creation: serverTimestamp()
  };

  /* ================= LIMIT CHECK ================= */
  const qAds = query(
    collection(db, "annonces"),
    where("userID", "==", user.uid),
    where("date_creation", ">=", startOfMonth())
  );

  const adsSnap = await getDocs(qAds);
  const hasSub = hasActiveSubscription(currentUserData.abonnements || []);

  if (!hasSub && adsSnap.size >= 2) {
    return showAlert("error", "Limite atteinte (2 annonces/mois).");
  }

  await addDoc(collection(db, "annonces"), annonceData);

  /* ================= VERIFY FLOW ================= */
  if (!currentUserData.verified) {
    showAlert("success", "Annonce publiée (compte non vérifié).");

    const verifyDiv = document.getElementById("verifyDiv");
    if (verifyDiv) verifyDiv.style.display = "block";

    const btnNow = document.getElementById("verifyNowBtn");
    const btnLater = document.getElementById("verifyLaterBtn");

    if (btnNow) btnNow.onclick = () => window.location.href = "verify.html";
    if (btnLater) btnLater.onclick = () => window.location.href = "dashboard.html";

    return;
  }

  showAlert("success", "Annonce publiée avec succès.");
  setTimeout(() => (window.location.href = "dashboard.html"), 1200);
});