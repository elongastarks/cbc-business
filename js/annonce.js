import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  increment,
  limit
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// --- CONFIG FIREBASE ---
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
const db = getFirestore(app);
const auth = getAuth(app);

// --- PARAM ---
const urlParams = new URLSearchParams(window.location.search);
const annonceID = urlParams.get("id");

if (!annonceID) {
  alert("Annonce non spécifiée.");
  window.location.href = "/";
}

let currentUser = null;

// --- AUTH ---
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  loadAnnonce();
});

// --- LOAD ---
async function loadAnnonce() {
  const annonceRef = doc(db, "annonces", annonceID);
  const annonceSnap = await getDoc(annonceRef);

  if (!annonceSnap.exists()) {
    alert("Annonce introuvable.");
    window.location.href = "/";
    return;
  }

  const annonce = annonceSnap.data();

  // --- OWNER ---
  const ownerRef = doc(db, "users", annonce.userID);
  const ownerSnap = await getDoc(ownerRef);
  const owner = ownerSnap.exists() ? ownerSnap.data() : null;

  // --- UI ANNONCE ---
  document.getElementById("annonceDetails").innerHTML = `
    <h1 id="titre">${annonce.titre}</h1>

    <div class="badges">
      <span class="badge urgent" style="display:${annonce.urgence ? "inline-block" : "none"}">Urgent</span>
      <span class="badge boost" style="display:${annonce.boost ? "inline-block" : "none"}">Boost</span>
    </div>

    <div class="meta">
      ${annonce.categorie} • ${annonce.ville} / ${annonce.province} •
      ${annonce.date_creation?.seconds
        ? new Date(annonce.date_creation.seconds * 1000).toLocaleDateString()
        : ""}
    </div>

    <div class="resume">
      <div>Type : ${annonce.type}</div>
      <div>Niveau : ${annonce.licence || "-"}</div>
      <div>Budget : ${annonce.salaire ? annonce.salaire + " $" : "-"}</div>
      <div>État : ${annonce.etat}</div>
    </div>

    <div class="description">
      <h2>Description</h2>
      <p>${annonce.pitch || ""}</p>
      <p>${annonce.description || "-"}</p>
    </div>

    <div class="stats">
      <div><h3>${annonce.views || 0}</h3><p>Vues</p></div>
      <div><h3>${annonce.clicks || 0}</h3><p>Clics</p></div>
      <div><h3>${annonce.commands || 0}</h3><p>Candidatures</p></div>
      <div><h3>${annonce.republis || 0}</h3><p>Reposts</p></div>
    </div>

    <div class="actions">
      <button id="btn-login" class="btn btn-primary">Se connecter</button>
      <button id="btn-postuler" class="btn btn-primary">Postuler</button>
      <button id="btn-contacter" class="btn btn-secondary">Contacter</button>
    </div>
  `;

  // --- OWNER PROFILE (CORRIGÉ DB USERS) ---
  if (owner) {
    document.getElementById("ownerProfile").innerHTML = `
      <div class="owner-card">
        <img src="${owner.photoURL || "default-avatar.png"}">
        <div>
          <h3>${owner.name}</h3>
          <p>${owner.type}</p>
          <p>${owner.country} • ${owner.ville} • ${owner.province}</p>
          <p>${owner.bio || ""}</p>
          <p>Disponibilité : ${owner.availability}</p>
          <p>${owner.verified ? "🔰 Vérifié" : "Non vérifié"}</p>
        </div>
      </div>
    `;
  }

  // --- VIEW +1 ---
  await updateDoc(annonceRef, {
    views: increment(1),
  });

  // --- BTN LOGIC ---
  const btnLogin = document.getElementById("btn-login");
  const btnPostuler = document.getElementById("btn-postuler");
  const btnContacter = document.getElementById("btn-contacter");
  const actions = document.querySelector(".actions");

  btnLogin.onclick = () => (window.location.href = "login.html");

  if (currentUser) {
    const isOwner = currentUser.uid === annonce.userID;

    if (isOwner) {
      btnLogin.style.display = "none";
      btnPostuler.style.display = "none";
      btnContacter.style.display = "none";

      if (!document.getElementById("btn-modifier")) {
        const btn = document.createElement("button");
        btn.id = "btn-modifier";
        btn.textContent = "Modifier l'annonce";
        btn.className = "btn btn-primary";
        btn.onclick = () => {
          window.location.href = `modifier.html?annonceID=${annonceID}`;
        };
        actions.appendChild(btn);
      }
    } else {
      btnLogin.style.display = "none";
      btnPostuler.style.display = "inline-block";
      btnContacter.style.display = "inline-block";

      btnContacter.onclick = () => {
        window.location.href = `chat.html?to=${annonce.userID}`;
      };
    }
  } else {
    btnLogin.style.display = "inline-block";
    btnPostuler.style.display = "none";
    btnContacter.style.display = "none";
  }

  // --- POSTULER ---
  btnPostuler.onclick = () => {
    document.getElementById("postuler-form").style.display = "block";
  };

  // --- SUBMIT POSTULER ---
  document.getElementById("btn-publier").onclick = async () => {
    if (!currentUser) return;

    const message = document.getElementById("cv_message").value.trim();
    if (message.length < 5) return alert("Message trop court");

    const already = await getDocs(
      query(
        collection(db, "commands"),
        where("annonceID", "==", annonceID),
        where("gestID", "==", currentUser.uid)
      )
    );

    if (!already.empty) return alert("Déjà postulé");

    const me = await getDoc(doc(db, "users", currentUser.uid));

    await addDoc(collection(db, "commands"), {
      name: me.exists() ? me.data().name : "user",
      annonceID,
      userID: annonce.userID,
      gestID: currentUser.uid,
      cv_message: message,
      date_commande: new Date()
    });

    await updateDoc(annonceRef, {
      commands: increment(1),
    });

    alert("Candidature envoyée");
  };

  // --- SUGGESTIONS LIMIT 5 ---
  const suggSnap = await getDocs(
    query(
      collection(db, "annonces"),
      where("categorie", "==", annonce.categorie),
      limit(5)
    )
  );

  const suggBox = document.getElementById("suggestions");
  suggBox.innerHTML = "<h3>Annonces similaires</h3>";

  suggSnap.forEach((d) => {
    if (d.id !== annonceID) {
      const a = d.data();
      suggBox.innerHTML += `
        <a href="annonce.html?id=${d.id}">${a.titre}</a>
      `;
    }
  });

  // --- LIMIT OWNER ADS (3 dernières) ---
  const ownerAdsSnap = await getDocs(
    query(
      collection(db, "annonces"),
      where("userID", "==", annonce.userID),
      limit(3)
    )
  );

  const ownerAdsBox = document.getElementById("ownerAds");
  ownerAdsBox.innerHTML = "<h4>Ses annonces</h4>";

  ownerAdsSnap.forEach((d) => {
    if (d.id !== annonceID) {
      const a = d.data();
      ownerAdsBox.innerHTML += `
        <a href="annonce.html?id=${d.id}">${a.titre}</a>
      `;
    }
  });
}
