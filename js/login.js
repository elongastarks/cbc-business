    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";  
    import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";  
  
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
  
    // Elements  
    const loginBtn = document.getElementById("loginBtn");  
    const errorMsg = document.getElementById("errorMsg");  
    const loader = document.getElementById("loader");  
  
    loginBtn.addEventListener("click", () => {  
        const email = document.getElementById("email").value.trim();  
        const password = document.getElementById("password").value.trim();  
  
        errorMsg.style.display = "none";  
  
        if (email === "" || password === "") {  
            errorMsg.textContent = "Veuillez remplir tous les champs.";  
            errorMsg.style.display = "block";  
            return;  
        }  
  
        loader.style.display = "block";  
        loginBtn.disabled = true;  
  
        signInWithEmailAndPassword(auth, email, password)  
            .then(() => {  
                loader.textContent = "Connexion réussie !";  
                setTimeout(() => {  
                    window.location.href = "dashboard.html";  
                }, 800);  
            })  
            .catch((error) => {  
    loader.style.display = "none";  
    loginBtn.disabled = false;  
  
    console.error("FIREBASE ERROR:", error); // 🔥 debug réel  
  
    let message = error.message; // fallback réel  
  
    if (error.code === "auth/user-not-found") message = "Utilisateur introuvable.";  
    else if (error.code === "auth/wrong-password") message = "Mot de passe incorrect.";  
    else if (error.code === "auth/invalid-email") message = "Email invalide.";  
    else if (error.code === "auth/network-request-failed") message = "Problème réseau.";  
    else if (error.code === "auth/too-many-requests") message = "Trop de tentatives. Réessaie plus tard.";  
  
    errorMsg.textContent = message;  
    errorMsg.style.display = "block";  
});  
  });
