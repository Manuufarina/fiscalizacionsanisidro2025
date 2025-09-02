// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// IMPORTANTE: Reemplaza esto con la configuración de tu propio proyecto de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAAaqOajWwLX_K9PF0NLvYM4Ecvpkq2qbI",
  authDomain: "fiscalizacion-san-isidro.firebaseapp.com",
  projectId: "fiscalizacion-san-isidro",
  storageBucket: "fiscalizacion-san-isidro.firebasestorage.app",
  messagingSenderId: "316196246026",
  appId: "1:316196246026:web:8b0546f002ef811a6705f3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Exportar instancias para usarlas en otros archivos
export { app, db, auth, storage };