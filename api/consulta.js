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

    // A. LIMPIEZA: Quitamos espacios en blanco
    cedula = cedula.toString().replace(/\s+/g, '');

    try {
        const headers = { 
            'Accept': 'application/json', 
            'Authorization': API_TOKEN 
        };
        const baseUrl = "https://www.cloud.wispro.co"; 
        
        // --- PASO 1: ENCONTRAR AL CLIENTE (EL SABUESO) ---
        // Buscamos la identidad de la persona, no importa cómo esté registrada.
        let clientes = [];
        let resp, json;

        // Intento 1: Por Cédula exacta
        resp = await fetch(`${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`, { headers });
        json = await resp.json();
        clientes = json.data || [];

        // Intento 2: Si no aparece, probamos agregando "001" (Para RUCs)
        if (clientes.length === 0) {
            const rucPosible = cedula + '001';
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${rucPosible}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        // Intento 3: Búsqueda directa en campo RUC con el número original
        if (clientes.length === 0) {
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        if (clientes.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // ¡TENEMOS AL CLIENTE!
        const cliente = clientes[0];
        const clienteId = cliente.id; // Este es el UUID (Ej: d1e65f29...)

        console.log(`✅ Cliente encontrado: ${cliente.name} | UUID: ${clienteId}`);

        // --- PASO 2: BUSCAR FACTURAS POR EL UUID (INFALIBLE) ---
        // Aquí usamos 'client_id_eq'. Esto vincula la factura directo a la ficha del cliente.
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${clienteId}&state_eq=pending`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${clienteId}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // --- PASO 3: CÁLCULO DE DEUDA ---
        let deudaTotal = 0;
        let fechaVencimiento = null;
        const facturasRaw = facturasData.data || [];

        console.log(`📊 Facturas encontradas para este UUID: ${facturasRaw.length}`);

        if (Array.isArray(facturasRaw)) {
            facturasRaw.forEach(f => {
                // DOBLE VERIFICACIÓN DE SEGURIDAD
                // Aunque buscamos por ID, verificamos que el ID de la factura coincida con el cliente.
                if (f.client_id && String(f.client_id) !== String(clienteId)) {
                    return; // Saltamos si hay algo raro
                }

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

        // --- PASO 4: RESPUESTA ---
        const contratos = contratosData.data || [];
        // Lógica mejorada para contrato: Buscar el "enabled" (habilitado)
        let contratoActivo = contratos.find(c => c.state === 'enabled');
        
        // Si no hay ninguno habilitado, buscamos si hay uno "disabled" (cortado)
        if (!contratoActivo) {
            contratoActivo = contratos.find(c => c.state === 'disabled');
        }
        
        // Si no hay ninguno, devolvemos objeto vacío
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
        console.error("Error crítico API:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}