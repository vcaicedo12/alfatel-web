// api/consulta.js
export default async function handler(req, res) {
    // 1. Configuración de Seguridad (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Obtener el token seguro desde las variables de Vercel
    const API_TOKEN = process.env.WISPRO_API_TOKEN;
    const { cedula } = req.query;

    if (!cedula) return res.status(400).json({ error: 'Cédula requerida' });

    try {
        const headers = { 
            'Accept': 'application/json', 
            'Authorization': API_TOKEN 
        };
        
        // --- LÓGICA DE BÚSQUEDA (La misma que tenías, pero ejecutada en el servidor) ---
        let clientes = [];
        
        // Intento A: Cédula exacta
        let resp = await fetch(`https://www.cloud.wispro.co/api/v1/clients?national_identification_number_eq=${cedula}`, { headers });
        let json = await resp.json();
        clientes = json.data || [];

        // Intento B: RUC
        if (clientes.length === 0) {
            resp = await fetch(`https://www.cloud.wispro.co/api/v1/clients?taxpayer_identification_number_eq=${cedula}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        // Intento C: Contiene
        if (clientes.length === 0) {
            resp = await fetch(`https://www.cloud.wispro.co/api/v1/clients?national_identification_number_cont=${cedula}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        if (clientes.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const cliente = clientes[0];

        // --- BÚSQUEDA DE DEUDA Y CONTRATO (En paralelo para más velocidad) ---
        // Nota: Debes ajustar la URL base a la real de Wispro si usas una distinta
        const baseUrl = "https://www.cloud.wispro.co"; 

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(`${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${cliente.id}&state_eq=pending`, { headers }),
            fetch(`${baseUrl}/api/v1/contracts?client_id_eq=${cliente.id}`, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // Procesar Facturas
        let deudaTotal = 0;
        let fechaVencimiento = null;
        (facturasData.data || []).forEach(f => {
            deudaTotal += parseFloat(f.balance);
            // Lógica simple de fecha
            const fecha = f.first_due_date || f.created_at;
            if (!fechaVencimiento || fecha < fechaVencimiento) fechaVencimiento = fecha;
        });

        // Procesar Contrato
        const contratos = contratosData.data || [];
        const contratoActivo = contratos.find(c => c.state === 'enabled') || contratos[0] || {};
        
        // Responder solo lo necesario al Frontend (¡No enviamos datos sensibles!)
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
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}