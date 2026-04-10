import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// --- CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyBla3D7OS8-Hx82m8Tz6ZPIS7FSLury3ew",
  authDomain: "cbc-business.firebaseapp.com",
  projectId: "cbc-business",
  storageBucket: "cbc-business.firebasestorage.app",
  messagingSenderId: "295952883135",
  appId: "1:295952883135:web:4624174a452c1f6aad950a",
  measurementId: "G-580W4D6J7E"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM SAFE ---
const emailEl = document.getElementById("email");
const nameEl = document.getElementById("name");
const telEl = document.getElementById("tel");
const typeEl = document.getElementById("type");
const photoEl = document.getElementById("photoURL");
const bioEl = document.getElementById("bio");
const provinceEl = document.getElementById("province");
const villeEl = document.getElementById("ville");
const availabilityEl = document.getElementById("availability");
const msgEl = document.getElementById("message");
const saveBtn = document.getElementById("saveBtn");

let currentUID = null;
let loading = false;

// --- MSG ---
function showMsg(text, color = "red") {
  msgEl.textContent = text;
  msgEl.style.color = color;
}

// --- CHAR LIMIT BIO ---
bioEl?.addEventListener("input", () => {
  const len = bioEl.value.length;
  if (len > 150) {
    bioEl.value = bioEl.value.slice(0, 150);
  }
});

// --- AUTH ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUID = user.uid;
  emailEl.value = user.email;

  try {
    const ref = doc(db, "users", currentUID);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      showMsg("Profil introuvable");
      return;
    }

    const data = snap.data();

    nameEl.value = data.name || "";
    telEl.value = data.tel || "";
    typeEl.value = data.type || "personnel";
    photoEl.value = data.photoURL || "";
    bioEl.value = data.bio || "";
    provinceEl.value = data.province || "";
    villeEl.value = data.ville || "";
    availabilityEl.value = data.availability || "disponible";

  } catch (err) {
    console.error(err);
    showMsg("Erreur de chargement profil");
  }
});

// --- SAVE ---
saveBtn.addEventListener("click", async () => {
  if (!currentUID || loading) return;

  const name = nameEl.value.trim();
  const tel = telEl.value.trim();
  const bio = bioEl.value.trim();
  const photoURL = photoEl.value.trim();
  const province = provinceEl.value;
  const ville = villeEl.value;
  const availability = availabilityEl.value;
  const type = typeEl.value;

  // --- VALIDATION ---
  if (!name || !tel) {
    showMsg("Nom et téléphone obligatoires");
    return;
  }

  if (bio.length > 150) {
    showMsg("Bio max 150 caractères");
    return;
  }

  loading = true;
  saveBtn.textContent = "Sauvegarde...";

  try {
    await updateDoc(doc(db, "users", currentUID), {
      name,
      tel,
      type,
      photoURL,
      bio,
      province,
      ville,
      availability
    });

    showMsg("Profil mis à jour ✔", "green");

  } catch (err) {
    console.error(err);
    showMsg("Erreur mise à jour");
  }

  loading = false;
  saveBtn.textContent = "Enregistrer";
});