/**
 * public/js/config.js
 * * Configuração do Firebase e constantes globais.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Lê as variáveis globais injetadas no index.html
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const apiKey = ""; // Chave da API Gemini (mantida vazia)

// Inicializa Firebase
let app, db, auth;
try {
    if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        setLogLevel('debug'); // Ativa logs do Firestore
        console.log("Firebase inicializado.");
    } else {
        console.warn("Configuração do Firebase não encontrada. Algumas funcionalidades podem não estar disponíveis.");
    }
} catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
}


// Exporta as constantes e instâncias inicializadas
export { appId, firebaseConfig, initialAuthToken, apiKey, app, db, auth };
