import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    increment,
    addDoc
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

const alertBox = document.getElementById("alertBox");

// --- ALERT ---
function showAlert(text, type = "error") {
    alertBox.style.display = "block";
    alertBox.textContent = text;
    alertBox.className = "alert " + (type === "success" ? "alert-success" : "alert-error");
}

// --- REFERRAL ---
function generateReferralCode(uid) {
    return uid.slice(0, 6) + Math.random().toString(36).slice(2, 6);
}

const urlParams = new URLSearchParams(window.location.search);
const refCodeFromUrl = urlParams.get("ref");

// --- CLICK SIGNUP ---
document.getElementById("signupBtn").addEventListener("click", async () => {

    // 🔹 INPUTS
    const name = document.getElementById("name").value.trim();
    const link = document.getElementById("link").value.trim();
    const email = document.getElementById("email").value.trim();
    const tel = document.getElementById("tel").value.trim();
    const type = document.getElementById("type").value;

    const country = "RDC"; // FIXÉ
    const province = document.getElementById("province").value;
    const ville = document.getElementById("ville").value;

    const tribu = document.getElementById("tribu").value.trim();
    const lieu = document.getElementById("lieu").value.trim();

    const bio = document.getElementById("bio").value.trim();
    const availability = document.getElementById("availability").value;

    const password = document.getElementById("password").value.trim();

    // --- VALIDATION SÉRIEUSE ---
    if (!name || !email || !tel || !password || !province || !ville || !bio) {
        showAlert("Champs obligatoires manquants.");
        return;
    }

    if (password.length < 6) {
        showAlert("Mot de passe ≥ 6 caractères.");
        return;
    }

    if (bio.length > 150) {
        showAlert("Bio trop longue (150 max).");
        return;
    }

    try {
        // --- AUTH ---
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;

        const myReferralCode = generateReferralCode(uid);

        // --- FIRESTORE ---
        await setDoc(doc(db, "users", uid), {
            userID: uid,
            name,
            email,
            tel,
            type,

            country,
            province,
            ville,
            tribu: tribu || "",
            lieu: lieu || "",

            bio,
            availability,

            date_inscription: serverTimestamp(),
            abonnements: [],
            active: true, // 🔥 pas false sinon user bloqué inutilement
            photoURL: link || "",
            verified: false,
            role: "user",

            referralCode: myReferralCode,
            referralsCount: 0
        });

        // --- REFERRAL SYSTEM ---
        if (refCodeFromUrl) {
            const q = query(
                collection(db, "users"),
                where("referralCode", "==", refCodeFromUrl)
            );

            const snap = await getDocs(q);

            if (!snap.empty) {
                const referrerId = snap.docs[0].id;

                await updateDoc(doc(db, "users", referrerId), {
                    referralsCount: increment(1)
                });

                await addDoc(collection(db, "referrals"), {
                    referrerId,
                    referredId: uid,
                    createdAt: serverTimestamp()
                });
            }
        }

        showAlert("Compte créé ! Redirection...", "success");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1200);

    } catch (error) {

        let msg = "Erreur inconnue.";

        if (error.code === "auth/email-already-in-use") msg = "Email déjà utilisé.";
        if (error.code === "auth/invalid-email") msg = "Email invalide.";
        if (error.code === "auth/weak-password") msg = "Mot de passe faible.";

        showAlert(msg);
    }
});