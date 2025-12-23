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

    // A. LIMPIEZA DE ESPACIOS
    cedula = cedula.toString().replace(/\s+/g, '');

    try {
        const headers = { 
            'Accept': 'application/json', 
            'Authorization': API_TOKEN 
        };
        const baseUrl = "https://www.cloud.wispro.co"; 
        
        // --- PASO 1: ENCONTRAR AL CLIENTE (SABUESO UUID) ---
        let clientes = [];
        let resp, json;

        // Intento 1: Cédula exacta
        resp = await fetch(`${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`, { headers });
        json = await resp.json();
        clientes = json.data || [];

        // Intento 2: RUC (agregando 001)
        if (clientes.length === 0) {
            const rucPosible = cedula + '001';
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${rucPosible}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        // Intento 3: RUC directo
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

        console.log(`✅ Cliente: ${cliente.name} | UUID: ${clienteId}`);

        // --- PASO 2: BUSCAR FACTURAS PENDIENTES ---
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${clienteId}&state_eq=pending`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${clienteId}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // --- PASO 3: FILTRADO INTELIGENTE (LA SOLUCIÓN A LOS $456) ---
        let deudaTotal = 0;
        let fechaVencimiento = null;
        const facturasRaw = facturasData.data || [];

        // CONFIGURACIÓN: Ignorar facturas de hace más de 6 meses
        // Esto elimina automáticamente las facturas "zombis" del 2021
        const FECHA_LIMITE = new Date();
        FECHA_LIMITE.setMonth(FECHA_LIMITE.getMonth() - 6);

        console.log(`📊 Total Facturas en Wispro (Sucias): ${facturasRaw.length}`);

        if (Array.isArray(facturasRaw)) {
            facturasRaw.forEach(f => {
                // Validación 1: Que la factura sea de este cliente (por seguridad)
                if (f.client_id && String(f.client_id) !== String(clienteId)) return;

                // Validación 2: FILTRO DE FECHA (Aquí ocurre la magia)
                const fechaFactura = new Date(f.first_due_date || f.created_at);
                
                // Si la factura es más vieja que 6 meses, la saltamos
                if (fechaFactura < FECHA_LIMITE) {
                    console.log(`🗑️ Ignorando factura vieja del ${fechaFactura.toISOString().split('T')[0]} (Posible error administrativo)`);
                    return; 
                }

                // Si es reciente (menos de 6 meses), la sumamos
                deudaTotal += parseFloat(f.balance || 0);

                // Calculamos fecha de vencimiento para mostrar
                let fechaFinal = f.first_due_date || f.second_due_date;
                if (!fechaFinal && f.created_at) fechaFinal = f.created_at.split('T')[0];

                if (fechaFinal) {
                    if (!fechaVencimiento || fechaFinal < fechaVencimiento) {
                        fechaVencimiento = fechaFinal;
                    }
                }
            });
        }

        console.log(`💰 Deuda Real (Limpia): $${deudaTotal}`);

        // --- PASO 4: RESPUESTA ---
        const contratos = contratosData.data || [];
        let contratoActivo = contratos.find(c => c.state === 'enabled');
        if (!contratoActivo) contratoActivo = contratos.find(c => c.state === 'disabled'); // Si está cortado, tomamos ese
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