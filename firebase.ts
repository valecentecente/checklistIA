
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- CONFIGURAÇÃO DO NOVO PROJETO: ChecklistIA ---
// Atualizado com as credenciais fornecidas pelo usuário

const firebaseConfig = {
  apiKey: "AIzaSyA5JGHsJUjJhoxeShn2282rQ0yfeGJ4-OA",
  authDomain: "checklistiaweb.firebaseapp.com",
  projectId: "checklistiaweb",
  storageBucket: "checklistiaweb.firebasestorage.app",
  messagingSenderId: "259212383030",
  appId: "1:259212383030:web:89244290bd528fe3a69997",
  measurementId: "G-HX3K038HY9"
};

// Verifica se a configuração foi feita
const isConfigured = firebaseConfig.apiKey !== "" && firebaseConfig.projectId !== "";

if (!isConfigured) {
    console.warn("⚠️ AVISO: O Firebase ainda não foi configurado corretamente.");
} else {
    console.log(`Firebase Conectado: ${firebaseConfig.projectId}`);
}

// Inicializa o Firebase
const app = isConfigured ? initializeApp(firebaseConfig) : undefined;
const auth = app ? getAuth(app) : undefined;
const db = app ? getFirestore(app) : undefined;

// Configuração Explícita de Persistência (Segurança/UX)
if (auth) {
    setPersistence(auth, browserLocalPersistence)
        .then(() => {
            // Persistência configurada com sucesso
        })
        .catch((error) => {
            console.error("Erro ao definir persistência do Firebase:", error);
        });
}

export { auth, db, isConfigured as isFirebaseConfigured };
