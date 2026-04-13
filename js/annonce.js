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
  limit,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

/* =========================
   CONFIG
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyBla3D7OS8-Hx82m8Tz6ZPIS7FSLury3ew",
  authDomain: "cbc-business.firebaseapp.com",
  projectId: "cbc-business"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* =========================
   PARAM
========================= */
const annonceID = new URLSearchParams(window.location.search).get("id");

if (!annonceID) {
  alert("Annonce introuvable");
  location.href = "/";
}

let currentUser = null;

/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  loadAnnonce();
});

/* =========================
   FORMAT AREA LOGIC
========================= */
const TOTAL_PROVINCES = 26;

function formatArea(area = {}) {
  const p = Array.isArray(area?.provinces)
    ? [...new Set(area.provinces.map(x => x.trim()))]
    : [];

  const v = Array.isArray(area?.villes)
    ? [...new Set(area.villes.map(x => x.trim()))]
    : [];

  const hasProvinces = p.length > 0;
  const hasVilles = v.length > 0;

  // CAS ULTRA STRICT : toutes les provinces
  if (p.length === TOTAL_PROVINCES) {
    return "📍 Toute la RDC";
  }

  const parts = [];

  if (hasProvinces) {
    parts.push(`📍 Provinces: ${p.join(", ")}`);
  }

  if (hasVilles) {
    parts.push(`🏙 Villes: ${v.join(", ")}`);
  }

  return parts.length ? parts.join(" • ") : "📍 Non spécifié";
}

/* =========================
   LOAD
========================= */
async function loadAnnonce() {
  const ref = doc(db, "annonces", annonceID);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("Annonce introuvable");
    location.href = "/";
    return;
  }

  const annonce = snap.data();

  /* =========================
     OWNER
  ========================= */
  const ownerSnap = await getDoc(doc(db, "users", annonce.userID));
  const owner = ownerSnap.exists() ? ownerSnap.data() : null;

  /* =========================
     AREA CLEAN DISPLAY
  ========================= */
  const region = formatArea(annonce.area);
  
  /* =========================
     RENDER MAIN
  ========================= */
  document.getElementById("annonceDetails").innerHTML = `
    <h1>${annonce.titre}</h1>

    <div class="badges">
      ${annonce.urgence ? `<span class="badge urgent">🔥 Urgent</span>` : ""}
      ${annonce.boost ? `<span class="badge boost">⚡ Boost</span>` : ""}
    </div>

    <div class="meta">
      ${annonce.categorie} •
      ${annonce.date_creation?.seconds
        ? new Date(annonce.date_creation.seconds * 1000).toLocaleDateString()
        : ""}
        <br><strong>région supportée :</strong>
        <br><i>${region}</i>
    </div>

    <div class="resume">
      <div>Licence : ${annonce.licence || "-"}</div>
      <div>Budget : ${annonce.salaire ? annonce.salaire + " $" : "-"}</div>
      <div>État : ${annonce.etat}</div>
    </div>

    <div class="description">
      <h2>Description</h2>
      <p>${annonce.pitch || ""}</p>
      <p>${annonce.description || ""}</p>
    </div>

    <div class="stats">
      <div><h3>${annonce.views || 0}</h3><p>Vues</p></div>
      <div><h3>${annonce.clicks || 0}</h3><p>Clics</p></div>
      <div><h3>${annonce.commands || 0}</h3><p>Candidatures</p></div>
      <div><h3>${annonce.republis || 0}</h3><p>Reposts</p></div>
    </div>

    <div class="actions">
      <button id="btn-login">Connexion</button>
      <button id="btn-postuler">Postuler</button>
      <button id="btn-contacter">Contacter</button>
    </div>
  `;

  /* =========================
     OWNER PROFILE
  ========================= */
  if (owner) {
    document.getElementById("ownerProfile").innerHTML = `
      <div class="owner-card">
        <img src="${owner.photoURL || "default.png"}"><br>
        <div>
          <h3>${owner.name}</h3>
          <p>${owner.type}</p>
          <p>${owner.country} • ${owner.ville} • ${owner.province}</p>
          <p>${owner.bio || ""}</p>
          <p>${owner.verified ? "🔰 Vérifié" : "Non vérifié"}</p>
        </div>
      </div>
    `;
    
const pdfLink = document.getElementById("pdf-link");

const pdfUrl = annonce.pdf_url?.trim();

if (pdfLink) {
  if (pdfUrl && pdfUrl.startsWith("http")) {
    pdfLink.href = pdfUrl;
    pdfLink.target = "_blank";
    pdfLink.removeAttribute("style");
    pdfLink.download = "document.pdf";
  } else {
    pdfLink.closest(".attachments").innerHTML =
      "<p>Aucun fichier joint</p>";
  }
}

  }

  /* =========================
     +1 VIEW
  ========================= */
  await updateDoc(ref, {
    views: increment(1)
  });

  /* =========================
     BUTTON LOGIC
  ========================= */
  const btnLogin = document.getElementById("btn-login");
  const btnPostuler = document.getElementById("btn-postuler");
  const btnContacter = document.getElementById("btn-contacter");

  btnLogin.onclick = () => (location.href = "login.html");

  if (currentUser) {
    const isOwner = currentUser.uid === annonce.userID;

    if (isOwner) {
      btnLogin.style.display = "none";
      btnPostuler.style.display = "none";
      btnContacter.style.display = "none";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Modifier";
      editBtn.onclick = () =>
        (location.href = `modifier.html?annonceID=${annonceID}`);

      document.querySelector(".actions").appendChild(editBtn);
    } else {
      btnLogin.style.display = "none";
      btnPostuler.style.display = "inline-block";
      btnContacter.style.display = "inline-block";

      btnContacter.onclick = () =>
        (location.href = `chat.html?to=${annonce.userID}`);
    }
  }

  /* =========================
     POSTULER
  ========================= */
  btnPostuler.onclick = () => {
    document.getElementById("postuler-form").style.display = "block";
  };

  document.getElementById("btn-publier").onclick = async () => {
    if (!currentUser) return;

    const message = document.getElementById("cv_message").value.trim();
    if (message.length < 5) return alert("Message trop court");

    const exists = await getDocs(
      query(
        collection(db, "commands"),
        where("annonceID", "==", annonceID),
        where("gestID", "==", currentUser.uid)
      )
    );

    if (!exists.empty) return alert("Déjà postulé");

    const me = await getDoc(doc(db, "users", currentUser.uid));

    await addDoc(collection(db, "commands"), {
      name: me.exists() ? me.data().name : "user",
      annonceID,
      userID: annonce.userID,
      gestID: currentUser.uid,
      cv_message: message,
      date_commande: new Date()
    });

    await updateDoc(ref, {
      commands: increment(1)
    });

    alert("Candidature envoyée");
  };

  /* =========================
     SMART SUGGESTIONS (BOOST + URGENT + AREA + CATEGORY)
  ========================= */
  const suggSnap = await getDocs(
  query(
    collection(db, "annonces"),
    where("categorie", "==", annonce.categorie),
where("boost", "==", true),
orderBy("date_creation", "desc"),
limit(10)
  )
);

const suggBox = document.getElementById("suggestions");

// header stable
suggBox.innerHTML = "<h3>🔥 Suggestions intelligentes</h3>";

let hasResults = false;

suggSnap.forEach((d) => {
  if (d.id === annonceID) return;

  const a = d.data();
  hasResults = true;

  const badge = a.boost
    ? "⚡ Boost"
    : a.urgence
    ? "🔥 Urgent"
    : "";

  suggBox.innerHTML += `
    <a href="annonce.html?id=${d.id}">
      ${a.titre || "Sans titre"} ${badge}
      <small>${a.pitch || ""}</small>
    </a>
  `;
});

// CAS VIDE
if (!hasResults) {
  suggBox.innerHTML += `
    <div class="empty-suggestions">
      Aucune suggestion disponible pour cette catégorie.
    </div>
  `;
}

  /* =========================
     OWNER ADS
  ========================= */
  const ownerAdsSnap = await getDocs(
    query(
      collection(db, "annonces"),
      where("userID", "==", annonce.userID),
      limit(3)
    )
  );

  const ownerBox = document.getElementById("ownerAds");
  ownerBox.innerHTML = "<h4>Ses annonces</h4>";

  ownerAdsSnap.forEach((d) => {
    if (d.id !== annonceID) {
      const a = d.data();
      ownerBox.innerHTML += `
        <a href="annonce.html?id=${d.id}">${a.titre}</a>
      `;
    }
  });
}
