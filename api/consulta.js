export default async function handler(req, res) {
    // --- CONFIGURACIÓN ESTÁNDAR ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const API_TOKEN = process.env.WISPRO_API_TOKEN;
    let { cedula } = req.query;

    if (!cedula) return res.status(400).json({ error: 'Cédula requerida' });
    cedula = cedula.toString().replace(/\s+/g, '');

    try {
        const headers = { 'Accept': 'application/json', 'Authorization': API_TOKEN };
        const baseUrl = "https://www.cloud.wispro.co";

        // 1. BUSCAR ID DEL CLIENTE
        // Buscamos por cédula o RUC
        let resp = await fetch(`${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`, { headers });
        let json = await resp.json();
        let clientes = json.data || [];

        if (clientes.length === 0) {
             // Intento RUC si falló cédula
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula + '001'}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }
        
        // Si sigue vacío, probamos RUC directo
        if (clientes.length === 0) {
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        if (clientes.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

        const cliente = clientes[0];

        // 2. TRAER FACTURAS PENDIENTES
        // Pedimos SOLO las facturas que no se han pagado (state_eq=pending)
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${cliente.id}&state_eq=pending`;
        const facturasResp = await fetch(invoicesUrl, { headers });
        const facturasData = await facturasResp.json();
        const facturas = facturasData.data || [];

        // 3. CALCULAR LA DEUDA REAL (LA MAGIA)
        // Wispro nos da el campo 'balance' en cada factura. Es lo que falta por pagar de esa factura.
        // Simplemente sumamos esos balances.
        
        let deudaTotal = 0;

        facturas.forEach(factura => {
            // El API devuelve strings tipo "15.00", lo convertimos a número
            const saldo = parseFloat(factura.balance);
            
            // Si es un número válido, lo sumamos
            if (!isNaN(saldo)) {
                deudaTotal += saldo;
            }
        });

        // Redondeamos a 2 decimales para que sea dinero real
        deudaTotal = Math.round(deudaTotal * 100) / 100;

        // 4. RESPONDER AL FRONTEND
        res.status(200).json({
            nombre: cliente.name,
            cedula: cedula,
            // Aquí va el número exacto (ej: 15.00)
            deuda: deudaTotal, 
            // Enviamos texto formateado por si te da pereza hacerlo en el front (ej: "$15.00")
            deudaFormateada: `$${deudaTotal.toFixed(2)}`,
            facturasPendientes: facturas.length
        });

    } catch (error) {
        console.error("Error crítico:", error);
        res.status(500).json({ error: 'Error al conectar con Wispro' });
    }
}