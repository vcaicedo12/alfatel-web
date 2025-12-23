export default async function handler(req, res) {
    // 1. Configuración de Seguridad
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const API_TOKEN = process.env.WISPRO_API_TOKEN;
    let { cedula } = req.query;

    if (!cedula) return res.status(400).json({ error: 'Cédula requerida' });

    // A. LIMPIEZA TOTAL: Quitamos espacios
    cedula = cedula.toString().replace(/\s+/g, '');

    try {
        const headers = { 
            'Accept': 'application/json', 
            'Authorization': API_TOKEN 
        };
        const baseUrl = "https://www.cloud.wispro.co"; 
        
        // --- PASO 1: ENCONTRAR AL CLIENTE (Sea Cédula o RUC) ---
        let clientes = [];
        let resp, json;

        // Intento 1: Búsqueda exacta (Cédula normal)
        resp = await fetch(`${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`, { headers });
        json = await resp.json();
        clientes = json.data || [];

        // Intento 2: Si no aparece, probamos agregando "001" (Lógica RUC)
        // Esto soluciona el caso de la cédula que fallaba si está como RUC
        if (clientes.length === 0) {
            const rucPosible = cedula + '001';
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${rucPosible}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        // Intento 3: Búsqueda directa en campo RUC con el número original (Por si acaso)
        if (clientes.length === 0) {
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        if (clientes.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const cliente = clientes[0];
        const clienteId = cliente.id; // ¡Este es el dato clave!

        if (!clienteId) {
             return res.status(500).json({ error: 'Error: Cliente sin ID en Wispro' });
        }

        // --- PASO 2: BUSCAR FACTURAS POR ID (LA FORMA SEGURA) ---
        // Al usar 'client_id_eq', no importa si es RUC, Cédula o Pasaporte.
        // Si el cliente existe, sus facturas aparecerán aquí.
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${encodeURIComponent(clienteId)}&state_eq=pending`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${encodeURIComponent(clienteId)}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // --- PASO 3: PROCESAR DATOS ---
        let deudaTotal = 0;
        let fechaVencimiento = null;
        const facturasRaw = facturasData.data || [];

        // Validamos que sea un array para evitar errores
        if (Array.isArray(facturasRaw)) {
            facturasRaw.forEach(f => {
                // NOTA: Aquí confiamos en la API porque buscamos por ID específico.
                // Ya no aplicamos filtros manuales que puedan borrar datos válidos.

                deudaTotal += parseFloat(f.balance || 0);

                // Lógica de fechas (Tu laboratorio)
                let fechaFinal = f.first_due_date;
                if (!fechaFinal) fechaFinal = f.second_due_date;
                if (!fechaFinal && f.created_at) fechaFinal = f.created_at.split('T')[0];

                if (fechaFinal) {
                    if (!fechaVencimiento || fechaFinal < fechaVencimiento) {
                        fechaVencimiento = fechaFinal;
                    }
                }
            });
        }

        // --- PASO 4: RESPONDER ---
        const contratos = contratosData.data || [];
        const contratoActivo = contratos.find(c => c.state === 'enabled') || contratos[0] || {};
        
        res.status(200).json({
            nombre: cliente.name,
            estado: contratoActivo.state || 'desconocido',
            plan: contratoActivo.plan_name || cliente.plan_name || 'Plan Básico',
            ip: contratoActivo.ip || '---',
            deuda: deudaTotal,
            fechaVencimiento: fechaVencimiento,
            encontrado: true
        });

    } catch (error) {
        console.error("Error API:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}