export default async function handler(req, res) {
    // 1. Configuración CORS (Permite que tu frontend se conecte)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const API_TOKEN = process.env.WISPRO_API_TOKEN;
    const { cedula } = req.query;

    if (!cedula) return res.status(400).json({ error: 'Cédula requerida' });

    try {
        const headers = { 
            'Accept': 'application/json', 
            'Authorization': API_TOKEN 
        };
        const baseUrl = "https://www.cloud.wispro.co"; 
        
        // --- PASO 1: BUSCAR EL CLIENTE ---
        let clientes = [];
        
        // Intento A: Por Cédula exacta
        let resp = await fetch(`${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`, { headers });
        let json = await resp.json();
        clientes = json.data || [];

        // Intento B: Por RUC (si no encontró por cédula)
        if (clientes.length === 0) {
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        if (clientes.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const cliente = clientes[0];
        const clienteId = cliente.id; // ID Único del cliente

        console.log(`✅ Cliente encontrado: ${cliente.name} (ID: ${clienteId})`);

        // --- PASO 2: BUSCAR FACTURAS (Y FILTRARLAS MANUALMENTE) ---
        // Pedimos las facturas pendientes filtradas por ID
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${clienteId}&state_eq=pending`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${clienteId}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // --- AQUÍ ESTÁ LA CORRECCIÓN CLAVE ---
        let deudaTotal = 0;
        let fechaVencimiento = null;
        const facturasRaw = facturasData.data || [];

        console.log(`🔎 Facturas recibidas de la API: ${facturasRaw.length}`);

        facturasRaw.forEach(f => {
            // 🛡️ FILTRO DE SEGURIDAD ESTRICTO 🛡️
            // Comparamos el ID de la factura con el ID del cliente.
            // Usamos String() para asegurar que comparamos texto con texto.
            if (String(f.client_id) !== String(clienteId)) {
                console.warn(`⚠️ Factura ajena detectada e ignorada. Pertenece a ID: ${f.client_id}`);
                return; // ¡SALTAR ESTA FACTURA!
            }

            // Si el ID coincide, sumamos la deuda
            deudaTotal += parseFloat(f.balance || 0);
            
            const fecha = f.first_due_date || f.created_at;
            if (!fechaVencimiento || fecha < fechaVencimiento) fechaVencimiento = fecha;
        });

        console.log(`💰 Deuda Real Calculada: $${deudaTotal}`);

        // --- PASO 3: RESPONDER AL FRONTEND ---
        const contratos = contratosData.data || [];
        const contratoActivo = contratos.find(c => c.state === 'enabled') || contratos[0] || {};
        
        res.status(200).json({
            nombre: cliente.name,
            estado: contratoActivo.state || 'desconocido',
            plan: contratoActivo.plan_name || cliente.plan_name || 'Plan Básico',
            ip: contratoActivo.ip || '---',
            deuda: deudaTotal, // Deuda ya filtrada y correcta
            fechaVencimiento: fechaVencimiento,
            encontrado: true
        });

    } catch (error) {
        console.error("Error crítico en API:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}