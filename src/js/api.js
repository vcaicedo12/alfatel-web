// === API WISPRO (BÚSQUEDA DIRECTA INTELIGENTE) ===
const API_TOKEN = '8765771f-94f6-4c43-8f97-676bb17d3810'; 

// Referencia al input del HTML
const searchInput = document.getElementById('cedula') || document.getElementById('search-input');

export async function handleClientSearch(e) {
    if(e) e.preventDefault();
    
    const inputEl = document.getElementById('cedula') || document.getElementById('search-input');
    const query = inputEl ? inputEl.value.trim() : '';
    
    if (!query) return;

    // Validación: Solo números
    if (!/^\d+$/.test(query)) {
        alert("Por favor ingresa solo números para la Cédula.");
        return;
    }

    uiLoading(true);
    
    try {
        // ESTRATEGIA DE BÚSQUEDA EN CASCADA (Para encontrar sí o sí)
        let clientes = [];

        // 1. INTENTO A: Búsqueda Exacta por Cédula (La más rápida)
        let url = `/api/v1/clients?national_identification_number_eq=${query}`;
        let resp = await fetch(url, { headers: { 'Accept': 'application/json', 'Authorization': API_TOKEN } });
        let json = await resp.json();
        clientes = json.data || [];

        // 2. INTENTO B: Búsqueda por RUC (Si falló la A)
        // (A veces registran la cédula en el campo RUC)
        if (clientes.length === 0) {
            console.log("⚠️ No encontrado por Cédula, intentando por RUC...");
            url = `/api/v1/clients?taxpayer_identification_number_eq=${query}`;
            resp = await fetch(url, { headers: { 'Accept': 'application/json', 'Authorization': API_TOKEN } });
            json = await resp.json();
            clientes = json.data || [];
        }

        // 3. INTENTO C: Búsqueda "Contiene" (Si falló la B)
        // (Para casos donde la cédula tiene espacios extra o guiones en el sistema: "0400... ")
        if (clientes.length === 0) {
            console.log("⚠️ No encontrado exacto, intentando búsqueda flexible...");
            url = `/api/v1/clients?national_identification_number_cont=${query}`;
            resp = await fetch(url, { headers: { 'Accept': 'application/json', 'Authorization': API_TOKEN } });
            json = await resp.json();
            clientes = json.data || [];
        }

        if (clientes.length > 0) {
            // ¡ENCONTRADO! Usamos el primero que apareció
            analizarCliente(clientes[0]);
        } else {
            // REALMENTE NO EXISTE
            mostrarErrorNoRegistrado();
        }

    } catch (err) { 
        console.error(err);
        mostrarError("Ocurrió un error al intentar conectar. Intente más tarde."); 
    }
}

async function analizarCliente(cliente) {
    uiLoading(true, "Consultando facturación...");

    try {
        console.log("✅ Cliente encontrado:", cliente.name);
        
        let deudaTotal = 0;
        let infoContrato = { plan: "Plan Desconocido", estado: "Desconocido", ip: "---" };
        let fechaVencimientoCritica = null; // La fecha más urgente

        // 2. BUSCAR FACTURAS PENDIENTES
        // IMPORTANTE: Ahora que tenemos el cliente real, usamos su cédula OFICIAL del sistema para buscar facturas.
        // Si el cliente no tiene cédula en el campo oficial (porque lo encontramos por RUC), usamos la query original como fallback o su ID.
        
        let urlFacturas = "";
        let usandoFiltroID = false;

        if (cliente.national_identification_number) {
             urlFacturas = `/api/v1/invoicing/invoices?client_national_identification_number_eq=${cliente.national_identification_number}&state_eq=pending`;
        } else {
             // Si lo encontramos por RUC y el campo cédula está vacío, buscamos facturas por ID de cliente (fallback seguro)
             // OJO: Este filtro suele fallar en la API y traer todas las facturas, por eso activamos el "Guardia" abajo.
             urlFacturas = `/api/v1/invoicing/invoices?client_id_eq=${cliente.id}&state_eq=pending`;
             usandoFiltroID = true;
        }

        const respFact = await fetch(urlFacturas, { headers: { 'Accept': 'application/json', 'Authorization': API_TOKEN } });
        
        if(respFact.ok) {
            const jsonFact = await respFact.json();
            const facturas = jsonFact.data || [];
            
            // === GUARDIA DE SEGURIDAD (FILTRO MANUAL) ===
            // Si la API nos mandó basura (facturas de otra gente), las borramos aquí.
            const facturasReales = facturas.filter(f => {
                // Si buscamos por cédula exacta, confiamos en la API.
                if (!usandoFiltroID) return true;

                // Si buscamos por ID (caso RUC), verificamos que el nombre coincida.
                // Normalizamos (mayúsculas y espacios) para comparar bien.
                const nombreFactura = (f.client_name || "").toUpperCase().trim();
                const nombreCliente = (cliente.name || "").toUpperCase().trim();
                
                return nombreFactura === nombreCliente;
            });

            console.log(`📊 Facturas API: ${facturas.length} -> Reales: ${facturasReales.length}`);

            facturasReales.forEach(f => {
                deudaTotal += parseFloat(f.balance);
                
                // === LÓGICA DE FECHAS ===
                let fechaFinal = f.first_due_date;
                if (!fechaFinal) fechaFinal = f.second_due_date;
                if (!fechaFinal && f.created_at) fechaFinal = f.created_at.split('T')[0];

                if (fechaFinal) {
                    if (!fechaVencimientoCritica || fechaFinal < fechaVencimientoCritica) {
                        fechaVencimientoCritica = fechaFinal;
                    }
                }
            });
        }

        // 3. BUSCAR CONTRATO
        const urlCont = `/api/v1/contracts?client_id_eq=${cliente.id}`;
        const respCont = await fetch(urlCont, { headers: { 'Accept': 'application/json', 'Authorization': API_TOKEN } });
        
        if(respCont.ok) {
            const jsonCont = await respCont.json();
            const contratos = jsonCont.data || [];
            const activo = contratos.find(c => c.state === 'enabled') || contratos[0];

            if(activo) {
                infoContrato.ip = activo.ip || "No asignada";
                infoContrato.estado = activo.state;
                
                if(activo.plan_name) {
                    infoContrato.plan = activo.plan_name;
                } else if(activo.plan_id) {
                    try {
                        const pResp = await fetch(`/api/v1/plans/${activo.plan_id}`, { headers: { 'Accept': 'application/json', 'Authorization': API_TOKEN } });
                        if(pResp.ok) {
                            const pData = await pResp.json();
                            const p = pData.data || pData; 
                            if(p.name) infoContrato.plan = p.name;
                        }
                    } catch(e) { console.warn("Error plan extra"); }
                } else if(cliente.plan_name) {
                    infoContrato.plan = cliente.plan_name;
                }
            }
        }

        renderizarResultados(cliente, deudaTotal, infoContrato, fechaVencimientoCritica);

    } catch (e) {
        console.error(e);
        mostrarError("Error al cargar los datos del cliente.");
    } finally {
        uiLoading(false);
    }
}

// === FUNCIONES VISUALES (UI) ===

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
    document.getElementById('resultArea').classList.remove('hidden');
    const errorState = document.getElementById('errorState');
    errorState.classList.remove('hidden');
    
    const iconDiv = errorState.querySelector('div.w-12');
    if(iconDiv) {
        iconDiv.classList.remove('bg-orange-100', 'text-orange-500');
        iconDiv.classList.add('bg-red-50', 'text-red-500');
    }
    
    const title = errorState.querySelector('h4');
    if(title) title.textContent = "Error";
    
    const p = errorState.querySelector('p.text-slate-600') || errorState.querySelector('p.text-slate-500');
    if(p) {
        p.textContent = msg;
        const btnContainer = errorState.querySelector('button'); 
        if(btnContainer && btnContainer.textContent.includes('Actualizar')) {
            btnContainer.style.display = 'none'; 
        }
    }
}

function mostrarErrorNoRegistrado() {
    uiLoading(false);
    document.getElementById('resultArea').classList.remove('hidden');
    const errorState = document.getElementById('errorState');
    errorState.classList.remove('hidden');

    const iconDiv = errorState.querySelector('div.w-12');
    if(iconDiv) {
        iconDiv.classList.remove('bg-red-50', 'text-red-500');
        iconDiv.classList.add('bg-orange-100', 'text-orange-500');
    }

    const title = errorState.querySelector('h4');
    if(title) title.textContent = "Cédula no registrada";

    const p = errorState.querySelector('p.text-slate-600') || errorState.querySelector('p.text-slate-500');
    if(p) {
        p.innerHTML = `No encontramos esta cédula en el sistema. <br>Si eres cliente, por favor actualiza tus datos.`;
    }

    let btn = errorState.querySelector('button');
    if(btn) {
        btn.style.display = 'flex';
        btn.onclick = () => window.redirigirWhatsapp('Hola Alfatel, quiero actualizar mis datos (Cédula no registrada en web).');
    }
}

function renderizarResultados(cliente, deuda, contrato, fechaVencimiento) {
    uiLoading(false);
    document.getElementById('resultArea').classList.remove('hidden');
    document.getElementById('successState').classList.remove('hidden');

    document.getElementById('clientName').textContent = cliente.name;
    document.getElementById('clientPlan').textContent = contrato.plan.toUpperCase();
    
    const labelEstado = document.querySelector('#clientIP').previousElementSibling;
    const valEstado = document.getElementById('clientIP');
    
    if(deuda > 0.10) {
        labelEstado.textContent = "Fecha Límite:";
        valEstado.textContent = fechaVencimiento || "Vencido";
        valEstado.className = "font-bold text-red-600 text-right";
    } else {
        labelEstado.textContent = "Estado:";
        valEstado.textContent = "Al Día";
        valEstado.className = "font-medium text-green-600 text-right";
    }

    document.getElementById('clientBalance').textContent = `$${deuda.toFixed(2)}`;
    
    const badge = document.getElementById('clientStatus');
    if(contrato.estado === 'disabled') {
        badge.textContent = "CORTADO";
        badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700";
    } else if (deuda > 0.10) {
        badge.textContent = "DEUDA";
        badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700";
    } else {
        badge.textContent = "ACTIVO";
        badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700";
    }
}

// Exponer globalmente para el HTML
window.handleClientSearch = handleClientSearch;