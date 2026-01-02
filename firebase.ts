
import * as firebaseApp from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getAnalytics, logEvent as firebaseLogEvent } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyA5JGHsJUjJhoxeShn2282rQ0yfeGJ4-OA",
  authDomain: "checklistiaweb.firebaseapp.com",
  projectId: "checklistiaweb",
  storageBucket: "checklistiaweb.firebasestorage.app",
  messagingSenderId: "259212383030",
  appId: "1:259212383030:web:89244290bd528fe3a69997",
  measurementId: "G-HX3K038HY9"
};

const isConfigured = firebaseConfig.apiKey !== "" && firebaseConfig.projectId !== "";

const app = isConfigured ? firebaseApp.initializeApp(firebaseConfig) : undefined;
const auth = app ? firebaseAuth.getAuth(app) : undefined;
const analytics = (app && typeof window !== 'undefined') ? getAnalytics(app) : undefined;

const db = app ? initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}) : undefined;

if (auth) {
    firebaseAuth.setPersistence(auth, firebaseAuth.browserLocalPersistence).catch((error) => {
        console.error("Erro ao definir persistência do Firebase Auth:", error);
    });
}

// Helper centralizado para Analytics para evitar erros de undefined
export const logEvent = (eventName: string, params?: Record<string, any>) => {
    if (analytics) {
        firebaseLogEvent(analytics, eventName, params);
    }
};

export { auth, db, analytics, isConfigured as isFirebaseConfigured };
