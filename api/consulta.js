// api/consulta.js
export default async function handler(req, res) {
    // CORS
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
        
        // 1. BUSCAR CLIENTE
        let clientes = [];
        
        // Intento A: Cédula exacta
        let resp = await fetch(`${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`, { headers });
        let json = await resp.json();
        clientes = json.data || [];

        // Intento B: Si no encuentra, buscar por RUC
        if (clientes.length === 0) {
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        if (clientes.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const cliente = clientes[0];
        const clienteId = cliente.id; // Guardamos el ID explícitamente

        // --- VALIDACIÓN IMPORTANTE ---
        // Si no tenemos ID, no podemos buscar facturas (evita traer todas)
        if (!clienteId) {
            console.error("Error: Cliente encontrado pero sin ID", cliente);
            return res.status(500).json({ error: 'Error en datos del cliente' });
        }

        console.log(`Cliente encontrado: ${cliente.name} (ID: ${clienteId})`);

        // 2. BUSCAR FACTURAS Y CONTRATOS ESPECÍFICOS DE ESTE ID
        // Usamos encodeURIComponent para evitar errores en la URL
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${encodeURIComponent(clienteId)}&state_eq=pending`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${encodeURIComponent(clienteId)}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // Debug: Ver en los logs de Vercel qué está pasando
        console.log(`Facturas encontradas para ID ${clienteId}: ${facturasData.data?.length || 0}`);

        // 3. PROCESAR DATOS
        let deudaTotal = 0;
        let fechaVencimiento = null;

        // Sumar SOLO si facturasData.data es un array válido
        if (Array.isArray(facturasData.data)) {
            facturasData.data.forEach(f => {
                // Doble verificación: asegurar que la factura pertenece al cliente (por si acaso la API falló el filtro)
                // Nota: Wispro suele devolver el objeto cliente dentro de la factura o el client_id
                if (f.client_id && String(f.client_id) !== String(clienteId)) {
                    return; // Ignorar factura si no coincide el ID (Protección extra)
                }
                
                deudaTotal += parseFloat(f.balance || 0);
                
                const fecha = f.first_due_date || f.created_at;
                if (!fechaVencimiento || fecha < fechaVencimiento) fechaVencimiento = fecha;
            });
        }

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
        console.error("Error en API:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}