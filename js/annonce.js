import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {   
  getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, increment   
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

// --- VARIABLES ---
const urlParams = new URLSearchParams(window.location.search);
const annonceID = urlParams.get('id');
if(!annonceID){
  alert("Annonce non spécifiée.");
  window.location.href = "/";
}
let currentUser = null;

// --- AUTH ---
onAuthStateChanged(auth, user => {
  currentUser = user;
  loadAnnonce();
});

// --- FONCTION PRINCIPALE ---
async function loadAnnonce() {
  const annonceRef = doc(db, "annonces", annonceID);
  const annonceSnap = await getDoc(annonceRef);
  if(!annonceSnap.exists()) {
    alert("Annonce introuvable.");
    window.location.href = "/";
    return;
  }

  const annonce = annonceSnap.data();

  // --- INJECTION ANNONCE DANS DOM ---
  const annonceMain = document.getElementById("annonceDetails");
  annonceMain.innerHTML = `
    <h1 id="titre">${annonce.titre}</h1>
    <div class="badges">
      <span class="badge urgent" style="display:${annonce.urgence ? 'inline-block':'none'}" id="badge-urgent">Urgent</span>
      <span class="badge boost" style="display:${annonce.boost ? 'inline-block':'none'}" id="badge-boost">Boost</span>
    </div>
    <div class="meta" id="meta-info">${annonce.categorie} • ${annonce.ville} / ${annonce.province} • ${new Date(annonce.date_creation.seconds * 1000).toLocaleDateString()}</div>
    <div class="resume">
      <div id="type">Type : ${annonce.type}</div>
      <div id="niveau">${annonce.type === "entreprise" ? "Niveau requis" : "Niveau atteint"} : ${annonce.licence || "-"}</div>
      <div id="salaire">Salaire / Budget : ${annonce.salaire ? annonce.salaire+" $" : "-"}</div>
      <div id="etat">État : ${annonce.etat}</div>
    </div>
    <div class="description">
      <h2>Description</h2>
      <p id="description">${annonce.description || "-"}</p>
      <p id="pitch">${annonce.pitch || ""}</p>
    </div>
    <div class="stats">
      <div class="stat"><h3 id="views">${annonce.views || 0}</h3><p>Vues</p></div>
      <div class="stat"><h3 id="clicks">${annonce.clicks || 0}</h3><p>Clics</p></div>
      <div class="stat"><h3 id="commands">${annonce.commands || 0}</h3><p>Candidatures</p></div>
      <div class="stat"><h3 id="republis">${annonce.republis || 0}</h3><p>Re-publications</p></div>
    </div>
    <div class="actions">
      <button id="btn-login" class="btn btn-primary">Se connecter</button>
      <button id="btn-postuler" class="btn btn-primary">Postuler</button>
      <button id="btn-contacter" class="btn btn-secondary">Contacter</button>
    </div>
  `;

  // --- OWNER PROFILE ---
  const ownerProfile = document.getElementById("ownerProfile");
  const userRef = doc(db,"users",annonce.userID);
  const userSnap = await getDoc(userRef);
  if(userSnap.exists()){
    const user = userSnap.data();
    ownerProfile.innerHTML = `
      <div class="owner-card">
        <img src="${user.photoURL || 'default-avatar.png'}" alt="${user.name}">
        <div>
          <h3>${user.name}</h3>
          <p>Type : ${user.type}</p>
          <p>Status : ${user.verified ? "🔰 Vérifié" : "Normal"}</p>
        </div>
      </div>
    `;
    // Badge verified
    document.getElementById("badge-verified")?.remove();
    const badgeVerified = document.createElement("span");
    badgeVerified.className = "badge verified";
    badgeVerified.id = "badge-verified";
    badgeVerified.textContent = "Vérifié";
    badgeVerified.style.display = user.verified ? "inline-block" : "none";
    document.querySelector(".badges").appendChild(badgeVerified);
  }

  // --- FICHIERS ---
  const pdfLink = document.getElementById("pdf-link");
  if(annonce.pdf_url){
    pdfLink.href = annonce.pdf_url;
    pdfLink.style.display = "inline";
  } else {
    document.getElementById("attachments").style.display = "none";
  }

  // --- INCREMENT VIEWS ---
  await updateDoc(annonceRef, { views: (annonce.views || 0) + 1 });

  // --- GESTION BOUTONS ---
  const btnLogin = document.getElementById("btn-login");
  const btnPostuler = document.getElementById("btn-postuler");
  const btnContacter = document.getElementById("btn-contacter");

  if(currentUser){
    const isOwner = currentUser.uid === annonce.userID;
    if(isOwner){
      btnLogin.style.display = "none";
      btnPostuler.style.display = "none";
      btnContacter.style.display = "none";

      // Marquer comme rendue
      if(!document.getElementById("btn-rendu")){
        const rendueBtn = document.createElement("button");
        rendueBtn.textContent = "Marquer comme rendue";
        rendueBtn.id = "btn-rendu";
        rendueBtn.className = "btn btn-secondary";
        rendueBtn.onclick = async () => {
          await updateDoc(annonceRef, { etat: "rendu" });
          document.getElementById("etat").textContent = "État : rendu";
          alert("Annonce marquée comme rendue !");
        };
        document.querySelector(".actions").appendChild(rendueBtn);
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

  // --- FORMULAIRE POSTULER ---
  btnPostuler.onclick = () => {
    document.getElementById("postuler-form").style.display = "block";
  };

  document.getElementById("btn-publier").onclick = async () => {
    if(!currentUser) return alert("Connectez-vous pour postuler.");
    if(currentUser.uid === annonce.userID) return alert("Vous êtes le propriétaire de cette annonce.");
    if(annonce.etat === "rendu") return alert("Annonce déjà rendue.");

    const message = document.getElementById("cv_message").value.trim();
    if(message.length < 5) return alert("Veuillez entrer un message valide.");

    const cmdQuery = query(collection(db,"commands"), 
      where("annonceID","==",annonceID), 
      where("gestID","==",currentUser.uid)
    );
    const cmdSnap = await getDocs(cmdQuery);
    if(!cmdSnap.empty) return alert("Vous avez déjà postulé à cette annonce.");

    const userSnapCmd = await getDoc(doc(db,"users",currentUser.uid));
    const realName = userSnapCmd.exists() ? userSnapCmd.data().name : "Anonyme";

    await addDoc(collection(db,"commands"), {
      name: realName,
      count_annonce: annonce.count || 0,
      cv_message: message,
      date_commande: new Date(),
      contacts: currentUser.email || "",
      annonceID: annonceID,
      userID : annonce.userID,
      gestID: currentUser.uid
    });

    await updateDoc(annonceRef, { commands: increment(1) });
    document.getElementById("commands").textContent = (annonce.commands || 0) + 1;
    alert("Candidature envoyée !");
    document.getElementById("postuler-form").style.display = "none";
    document.getElementById("cv_message").value = "";
    btnPostuler.disabled = true;
  };

  // --- SUGGESTIONS ---
  const suggestionsSection = document.getElementById("suggestions");
  const suggestionsQuery = query(collection(db,"annonces"), where("categorie","==",annonce.categorie));
  const suggestionsSnap = await getDocs(suggestionsQuery);
  suggestionsSection.innerHTML = `<h3>Annonces similaires</h3>`;
  suggestionsSnap.forEach(docSnap => {
    const ad = docSnap.data();
    if(docSnap.id !== annonceID){
      const adDiv = document.createElement("div");
      adDiv.innerHTML = `<a href="annonce.html?id=${docSnap.id}">${ad.titre}</a>`;
      suggestionsSection.appendChild(adDiv);
    }
  });
}
