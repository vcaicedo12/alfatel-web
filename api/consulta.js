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

    // A. LIMPIEZA DE ESPACIOS (Fundamental para que funcione la búsqueda)
    cedula = cedula.toString().replace(/\s+/g, '');

    try {
        const headers = { 
            'Accept': 'application/json', 
            'Authorization': API_TOKEN 
        };
        const baseUrl = "https://www.cloud.wispro.co"; 
        
        // --- PASO 1: ENCONTRAR AL CLIENTE (SABUESO) ---
        let clientes = [];
        let resp, json;

        // Búsqueda 1: Cédula exacta
        resp = await fetch(`${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`, { headers });
        json = await resp.json();
        clientes = json.data || [];

        // Búsqueda 2: RUC (agregando 001)
        if (clientes.length === 0) {
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula + '001'}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        // Búsqueda 3: RUC directo
        if (clientes.length === 0) {
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        if (clientes.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const cliente = clientes[0];
        const clienteId = cliente.id; // UUID Maestro

        // --- PASO 2: BUSCAR FACTURAS ---
        // Confiamos en la API: Si pedimos facturas de este ID, son de este cliente.
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${clienteId}&state_eq=pending`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${clienteId}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // --- PASO 3: FILTRADO POR AÑO (Simple y Robusto) ---
        let deudaTotal = 0;
        let fechaVencimiento = null;
        const facturasRaw = facturasData.data || [];
        
        // Obtenemos el año actual para referencia (ej: 2025)
        const anioActual = new Date().getFullYear();

        facturasRaw.forEach(f => {
            // Obtenemos la fecha de la factura. Si falla, usamos la fecha de hoy por seguridad.
            const fechaStr = f.first_due_date || f.created_at || new Date().toISOString();
            const fechaFactura = new Date(fechaStr);
            const anioFactura = fechaFactura.getFullYear();

            // --- REGLA DE ORO ---
            // Solo aceptamos facturas del año actual (2025) y del año anterior (2024).
            // Todo lo que sea 2023, 2022, 2021... se ignora.
            if (anioFactura < (anioActual - 1)) {
                // Es muy vieja (Zombie), la saltamos.
                return;
            }

            // Si pasa el filtro, sumamos
            deudaTotal += parseFloat(f.balance || 0);

            // Calcular fecha a mostrar
            let fechaFinal = f.first_due_date || f.second_due_date;
            if (!fechaFinal && f.created_at) fechaFinal = f.created_at.split('T')[0];

            if (fechaFinal) {
                if (!fechaVencimiento || fechaFinal < fechaVencimiento) {
                    fechaVencimiento = fechaFinal;
                }
            }
        });

        // --- PASO 4: RESPUESTA ---
        const contratos = contratosData.data || [];
        let contratoActivo = contratos.find(c => c.state === 'enabled');
        if (!contratoActivo) contratoActivo = contratos.find(c => c.state === 'disabled');
        contratoActivo = contratoActivo || {};

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