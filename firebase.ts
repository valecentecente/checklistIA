
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

// --- CONFIGURAÇÃO DO NOVO PROJETO: ChecklistIA ---
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

// Inicializa o Firebase
const app = isConfigured ? initializeApp(firebaseConfig) : undefined;
const auth = app ? getAuth(app) : undefined;

// Inicialização Robusta do Firestore com Cache Persistente (Blindagem contra erros de rede)
const db = app ? initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}) : undefined;

// Configuração de Persistência de Autenticação
if (auth) {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error("Erro ao definir persistência do Firebase Auth:", error);
    });
}

export { auth, db, isConfigured as isFirebaseConfigured };
