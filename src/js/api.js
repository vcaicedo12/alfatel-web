// src/js/api.js
// Lógica del Frontend segura: Llama al Backend de Vercel en lugar de a Wispro directo.

// 1. FUNCIÓN PRINCIPAL DE BÚSQUEDA
export async function handleClientSearch(e) {
    if(e) e.preventDefault();
    
    // Detectar input (móvil o escritorio)
    const inputEl = document.getElementById('cedula') || document.getElementById('search-input');
    const query = inputEl ? inputEl.value.trim() : '';
    
    if (!query) return;

    // Validación básica: Solo números
    if (!/^\d+$/.test(query)) {
        alert("Por favor ingresa solo números para la Cédula.");
        return;
    }

    // Activar animación de carga
    uiLoading(true);
    
    try {
        // === CONEXIÓN SEGURA AL BACKEND (VERCEL) ===
        // Esto protege tu Token de Wispro. 
        // El navegador llama a TU servidor, y tu servidor llama a Wispro.
        const respuesta = await fetch(`/api/consulta?cedula=${query}`);
        
        // Manejo de errores HTTP
        if (!respuesta.ok) {
            if(respuesta.status === 404) {
                 // Cliente no encontrado (404 real del backend)
                 mostrarErrorNoRegistrado();
                 return;
            }
            // Otros errores (500, 403, etc)
            throw new Error('Error en la búsqueda');
        }

        // Si todo sale bien, obtenemos los datos limpios
        const datos = await respuesta.json();

        // Renderizar en pantalla con los datos procesados
        renderizarResultadosSimplificado(datos);

    } catch (err) { 
        console.error(err);
        mostrarError("Ocurrió un error al intentar conectar. Intente más tarde."); 
    } finally {
        // Desactivar animación de carga siempre
        uiLoading(false);
    }
}

// 2. FUNCIÓN DE RENDERIZADO (Adapta los datos del Backend a tu HTML)
function renderizarResultadosSimplificado(data) {
    // Mostrar el área de resultados
    const resultArea = document.getElementById('resultArea');
    const successState = document.getElementById('successState');
    if (resultArea) resultArea.classList.remove('hidden');
    if (successState) successState.classList.remove('hidden');

    // 1. Llenar Textos Básicos
    document.getElementById('clientName').textContent = data.nombre;
    document.getElementById('clientPlan').textContent = (data.plan || "Plan Desconocido").toUpperCase();
    document.getElementById('clientBalance').textContent = `$${data.deuda.toFixed(2)}`;

    // 2. Lógica de Estado (Visual)
    const labelEstado = document.querySelector('#clientIP').previousElementSibling; // El label "Estado:" o "Fecha:"
    const valEstado = document.getElementById('clientIP'); // El texto de estado
    const badge = document.getElementById('clientStatus'); // La etiqueta de color (ACTIVO/CORTADO)

    // Lógica de colores y textos según la deuda y estado
    if (data.estado === 'disabled') {
        // CASO 1: CORTADO
        if(labelEstado) labelEstado.textContent = "Estado:";
        valEstado.textContent = "Servicio Cortado";
        valEstado.className = "font-bold text-gray-500 text-right";
        
        badge.textContent = "CORTADO";
        badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700";

    } else if (data.deuda > 0.10) {
        // CASO 2: CON DEUDA (ACTIVO PERO DEBE)
        if(labelEstado) labelEstado.textContent = "Fecha Límite:";
        // Si el backend nos mandó fecha, la usamos, sino ponemos "Vencido"
        valEstado.textContent = data.fechaVencimiento ? data.fechaVencimiento : "Vencido";
        valEstado.className = "font-bold text-red-600 text-right";
        
        badge.textContent = "PAGO PENDIENTE";
        badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700";

    } else {
        // CASO 3: AL DÍA (TODO PERFECTO)
        if(labelEstado) labelEstado.textContent = "Estado:";
        valEstado.textContent = "Al Día";
        valEstado.className = "font-medium text-green-600 text-right";
        
        badge.textContent = "ACTIVO";
        badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700";
    }
}

// 3. FUNCIONES DE UI (Loading y Errores) - Igual que antes
function uiLoading(show, text = "Consultando...") {
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const btnIcon = document.getElementById('btnIcon');
    const resultArea = document.getElementById('resultArea');
    const successState = document.getElementById('successState');
    const errorState = document.getElementById('errorState');

    if(show) {
        if(btnText) btnText.textContent = text;
        if(btnLoader) btnLoader.classList.remove('hidden');
        if(btnIcon) btnIcon.classList.add('hidden');
        if(resultArea) resultArea.classList.add('hidden');
        if(successState) successState.classList.add('hidden');
        if(errorState) errorState.classList.add('hidden');
    } else {
        if(btnText) btnText.textContent = "Consultar Deuda";
        if(btnLoader) btnLoader.classList.add('hidden');
        if(btnIcon) btnIcon.classList.remove('hidden');
    }
}

function mostrarError(msg) {
    uiLoading(false);
    const resultArea = document.getElementById('resultArea');
    const errorState = document.getElementById('errorState');
    
    if (resultArea) resultArea.classList.remove('hidden');
    if (errorState) {
        errorState.classList.remove('hidden');
        
        // Estilar como Error Crítico
        const iconDiv = errorState.querySelector('div.w-14'); // Ajustado selector Tailwind
        if(iconDiv) {
            iconDiv.classList.remove('bg-orange-100', 'text-orange-500');
            iconDiv.classList.add('bg-red-50', 'text-red-500');
        }
        
        const title = errorState.querySelector('h4');
        if(title) title.textContent = "Error";
        
        const p = errorState.querySelector('p');
        if(p) p.textContent = msg;

        // Ocultar botón de whatsapp en errores técnicos genéricos
        const btn = errorState.querySelector('button');
        if(btn) btn.style.display = 'none';
    }
}

function mostrarErrorNoRegistrado() {
    uiLoading(false);
    const resultArea = document.getElementById('resultArea');
    const errorState = document.getElementById('errorState');

    if (resultArea) resultArea.classList.remove('hidden');
    if (errorState) {
        errorState.classList.remove('hidden');

        // Estilar como Advertencia (Naranja)
        const iconDiv = errorState.querySelector('div.w-14');
        if(iconDiv) {
            iconDiv.classList.remove('bg-red-50', 'text-red-500');
            iconDiv.classList.add('bg-orange-100', 'text-orange-500');
        }

        const title = errorState.querySelector('h4');
        if(title) title.textContent = "Cédula no registrada";

        const p = errorState.querySelector('p');
        if(p) p.innerHTML = `No encontramos esta cédula en el sistema. <br>Si eres cliente, por favor actualiza tus datos.`;

        // Mostrar botón de Whatsapp para actualizar
        let btn = errorState.querySelector('button');
        if(btn) {
            btn.style.display = 'flex';
            // Asumiendo que redirigirWhatsapp está global en main.js o window
            btn.onclick = () => window.redirigirWhatsapp ? window.redirigirWhatsapp('Actualizar Datos') : alert("Contacta a soporte.");
        }
    }
}

// Exponer globalmente para el HTML (onsubmit="handleClientSearch(event)")
window.handleClientSearch = handleClientSearch;