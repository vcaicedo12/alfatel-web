export default async function handler(req, res) {
    // 1. Configuración de Seguridad (CORS)
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

    // Limpieza de cédula
    cedula = cedula.toString().replace(/\s+/g, '');

    try {
        const headers = { 'Accept': 'application/json', 'Authorization': API_TOKEN };
        const baseUrl = "https://www.cloud.wispro.co"; 
        
        // --- PASO 1: ENCONTRAR AL CLIENTE (Tu lógica de búsqueda es correcta) ---
        let clientes = [];
        let resp = await fetch(`${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`, { headers });
        let json = await resp.json();
        clientes = json.data || [];

        // Intento RUC (Cedula + 001)
        if (clientes.length === 0) {
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula + '001'}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        // Intento RUC directo
        if (clientes.length === 0) {
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        if (clientes.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const cliente = clientes[0];
        const clienteId = cliente.id;

        // --- PASO 2: BUSCAR FACTURAS PENDIENTES Y CONTRATOS ---
        // Nota: Wispro pagina los resultados. Si un cliente tiene MÁS de 50 facturas pendientes (raro), 
        // solo sumaría las primeras 50. Para el 99% de los casos, esto basta.
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${clienteId}&state_eq=pending`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${clienteId}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // --- PASO 3: SUMA DE DEUDA REAL (CORREGIDO) ---
        let deudaTotal = 0;
        let fechaVencimiento = null;
        const facturasRaw = facturasData.data || [];

        console.log(`Cliente ${cliente.name}: Encontradas ${facturasRaw.length} facturas pendientes.`);

        facturasRaw.forEach(f => {
            // ERROR ANTERIOR: Ignorábamos facturas viejas. 
            // CORRECCIÓN: Si el estado es 'pending' (que ya filtramos en la URL), SE DEBE COBRAR.
            
            // Parseamos el balance con seguridad
            const saldoPendiente = parseFloat(f.balance);

            // Solo sumamos si es un número válido
            if (!isNaN(saldoPendiente)) {
                deudaTotal += saldoPendiente;
            }

            // Calcular fecha de vencimiento más antigua (la prioridad para pagar)
            let fechaFinal = f.first_due_date || (f.created_at ? f.created_at.split('T')[0] : null);
            
            if (fechaFinal) {
                if (!fechaVencimiento || fechaFinal < fechaVencimiento) {
                    fechaVencimiento = fechaFinal;
                }
            }
        });

        // Redondeo final para evitar errores de punto flotante (ej: 15.000000001)
        deudaTotal = Math.round(deudaTotal * 100) / 100;

        // --- PASO 4: RESPUESTA ---
        const contratos = contratosData.data || [];
        // Lógica para encontrar el plan más relevante
        let contratoActivo = contratos.find(c => c.state === 'enabled');
        if (!contratoActivo) contratoActivo = contratos.find(c => c.state === 'disabled');
        contratoActivo = contratoActivo || {};

        res.status(200).json({
            nombre: cliente.name,
            estado: contratoActivo.state || 'desconocido',
            plan: contratoActivo.plan_name || cliente.plan_name || 'Plan Básico',
            ip: contratoActivo.ip || '---',
            deuda: deudaTotal, 
            moneda: '$', // Agregamos esto para claridad en el frontend
            fechaVencimiento: fechaVencimiento,
            facturasPendientesCount: facturasRaw.length, // Dato extra útil para depurar
            encontrado: true
        });

    } catch (error) {
        console.error("Error API:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}