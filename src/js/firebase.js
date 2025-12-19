import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// 1. Importa initializeFirestore y persistentLocalCache
import { getFirestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";

const firebaseConfig = {
  // ... (tus credenciales siguen igual)
  apiKey: "AIzaSyCU0rWbV3k6VnqDY73cTbCK-kDA5qJ_oJk",
  authDomain: "alfatel-6f784.firebaseapp.com",
  projectId: "alfatel-6f784",
  storageBucket: "alfatel-6f784.firebasestorage.app",
  messagingSenderId: "15949558892",
  appId: "1:15949558892:web:cb72d7eb12fdb4d06d9449"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 2. CAMBIO CLAVE: Inicializar Firestore con configuración explícita
const db = initializeFirestore(app, {
    // Esto fuerza el uso de fetch en lugar de WebSockets (más estable en redes inestables)
    experimentalForceLongPolling: true, 
    // Esto asegura que la caché funcione bien offline
    localCache: persistentLocalCache() 
});

console.log("🔥 Firestore inicializado con LongPolling");

export { auth, db };