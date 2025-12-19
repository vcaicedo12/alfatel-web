import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore"; 
import { auth, db } from "./firebase.js";
import { validarExistenciaCliente, obtenerDatosCompletos } from "./api.js";

// Referencias UI
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const viewLogin = document.getElementById('view-login');
const viewRegister = document.getElementById('view-register');
const viewDashboard = document.getElementById('view-dashboard'); // Donde se ven los datos
const loadingOverlay = document.getElementById('auth-loading');

// 1. MANEJAR REGISTRO
if(formRegister) {
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cedula = document.getElementById('reg-cedula').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const pass = document.getElementById('reg-pass').value;

        showLoading(true, "Verificando cliente...");

        // A. Verificar en Wispro
        const existeEnWispro = await validarExistenciaCliente(cedula);
        
        if (!existeEnWispro) {
            showLoading(false);
            alert("❌ Esta cédula no figura como cliente activo de ALFATEL.");
            return;
        }

        try {
            // B. Crear usuario en Firebase Auth
            showLoading(true, "Creando cuenta...");
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const user = userCredential.user;

            // C. Guardar la cédula en la Base de Datos (Firestore)
            await setDoc(doc(db, "usuarios", user.uid), {
                cedula: cedula,
                email: email,
                fechaRegistro: new Date()
            });

            alert("✅ ¡Cuenta creada con éxito!");
            // El listener de onAuthStateChanged manejará la redirección

        } catch (error) {
            showLoading(false);
            console.error(error);
            if(error.code === 'auth/email-already-in-use') alert("Este correo ya está registrado.");
            else alert("Error al registrar: " + error.message);
        }
    });
}

// 2. MANEJAR LOGIN
if(formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const pass = document.getElementById('login-pass').value;

        showLoading(true, "Iniciando sesión...");

        try {
            await signInWithEmailAndPassword(auth, email, pass);
            // El listener manejará el resto
        } catch (error) {
            showLoading(false);
            alert("❌ Correo o contraseña incorrectos.");
        }
    });
}

// 3. MANEJAR LOGOUT
window.cerrarSesion = () => {
    signOut(auth);
    location.reload(); // Recargar para limpiar todo
};

// 4. ESCUCHAR CAMBIOS DE ESTADO (LOGIN/LOGOUT)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // USUARIO LOGUEADO
        console.log("Usuario activo:", user.email);
        showLoading(true, "Cargando tus datos...");

        try {
            // Obtener cédula de Firestore
            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const dataUser = docSnap.data();
                // Consultar Wispro con esa cédula
                const datosWispro = await obtenerDatosCompletos(dataUser.cedula);
                
                if(datosWispro) {
                    renderizarDashboard(datosWispro);
                    mostrarPantalla('dashboard');
                } else {
                    alert("Error cargando datos de Wispro.");
                    mostrarPantalla('login');
                }
            } else {
                console.error("Usuario sin cédula asociada.");
                mostrarPantalla('login');
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión.");
        } finally {
            showLoading(false);
        }

    } else {
        // USUARIO NO LOGUEADO
        mostrarPantalla('login');
        showLoading(false);
    }
});

// === UI HELPERS ===
function mostrarPantalla(tipo) {
    viewLogin.classList.add('hidden');
    viewRegister.classList.add('hidden');
    viewDashboard.classList.add('hidden');

    if(tipo === 'login') viewLogin.classList.remove('hidden');
    if(tipo === 'register') viewRegister.classList.remove('hidden');
    if(tipo === 'dashboard') viewDashboard.classList.remove('hidden');
}

window.cambiarVistaAuth = (vista) => {
    mostrarPantalla(vista);
}

function showLoading(show, msg) {
    if(show) {
        loadingOverlay.classList.remove('hidden');
        document.getElementById('loading-text').textContent = msg || "Cargando...";
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function renderizarDashboard(data) {
    document.getElementById('dash-nombre').textContent = data.nombre;
    document.getElementById('dash-plan').textContent = data.plan.toUpperCase();
    document.getElementById('dash-deuda').textContent = `$${data.deuda.toFixed(2)}`;
    
    // Estado y colores
    const badge = document.getElementById('dash-estado');
    if(data.estadoServicio === 'disabled') {
        badge.textContent = "CORTADO";
        badge.className = "bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-bold";
    } else if (data.deuda > 0.10) {
        badge.textContent = "DEUDA PENDIENTE";
        badge.className = "bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold";
    } else {
        badge.textContent = "AL DÍA";
        badge.className = "bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold";
    }
}