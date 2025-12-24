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

    // LIMPIEZA AGRESIVA: Solo números
    cedula = cedula.toString().replace(/\D/g, '');

    try {
        const headers = { 'Accept': 'application/json', 'Authorization': API_TOKEN };
        const baseUrl = "https://www.cloud.wispro.co"; 
        
        // --- PASO 1: ENCONTRAR AL CLIENTE ---
        let cliente = null;
        let intentos = [
            { url: `${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`, tipo: 'Cédula exacta' },
            { url: `${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula}001`, tipo: 'RUC con 001' },
            { url: `${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula}`, tipo: 'RUC directo' },
            { url: `${baseUrl}/api/v1/clients?national_identification_number_cont=${cedula}`, tipo: 'Búsqueda parcial' },
        ];

        for (let intento of intentos) {
            const resp = await fetch(intento.url, { headers });
            const json = await resp.json();
            
            if (json.data && json.data.length > 0) {
                cliente = json.data[0];
                console.log(`✅ Cliente encontrado con: ${intento.tipo}`);
                break;
            }
        }

        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado con cédula: ' + cedula });
        }

        const clienteId = cliente.id;
        console.log(`👤 Cliente: ${cliente.name} | ID: ${clienteId}`);

        // --- PASO 2: OBTENER DETALLES COMPLETOS DEL CLIENTE (INCLUYE BALANCE) ---
        // Este endpoint trae el balance C/C calculado por Wispro
        const clienteDetalleResp = await fetch(`${baseUrl}/api/v1/clients/${clienteId}`, { headers });
        const clienteDetalle = await clienteDetalleResp.json();

        // --- PASO 3: EXTRAER BALANCE REAL ---
        // Wispro calcula automáticamente: balance = credito - facturas_impagas
        let deudaReal = 0;
        let creditoDisponible = 0;
        let facturasImpagas = 0;

        // El balance puede venir en diferentes campos según la configuración de Wispro
        if (clienteDetalle.balance !== undefined && clienteDetalle.balance !== null) {
            deudaReal = parseFloat(clienteDetalle.balance);
        } else if (clienteDetalle.current_account_balance !== undefined) {
            deudaReal = parseFloat(clienteDetalle.current_account_balance);
        }

        // Información adicional del balance
        if (clienteDetalle.credit !== undefined) {
            creditoDisponible = parseFloat(clienteDetalle.credit || 0);
        }
        if (clienteDetalle.unpaid_invoices !== undefined) {
            facturasImpagas = parseFloat(clienteDetalle.unpaid_invoices || 0);
        }

        // Si el balance es negativo, el cliente DEBE ese monto
        // Si es positivo, tiene crédito a favor
        const deuda = deudaReal < 0 ? Math.abs(deudaReal) : 0;

        console.log(`💰 Balance C/C: ${deudaReal}`);
        console.log(`💳 Crédito disponible: ${creditoDisponible}`);
        console.log(`📄 Facturas impagas: ${facturasImpagas}`);
        console.log(`🔴 DEUDA REAL: ${deuda}`);

        // --- PASO 4: OBTENER INFO DE CONTRATOS ---
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${clienteId}`;
        const contratosResp = await fetch(contractsUrl, { headers });
        const contratosData = await contratosResp.json();

        const contratos = contratosData.data || [];
        let contratoActivo = contratos.find(c => c.state === 'enabled');
        if (!contratoActivo) contratoActivo = contratos.find(c => c.state === 'disabled');
        contratoActivo = contratoActivo || {};

        // --- PASO 5: BUSCAR FECHA DE VENCIMIENTO (OPCIONAL) ---
        let fechaVencimiento = null;
        if (deuda > 0) {
            // Solo buscamos facturas pendientes si hay deuda
            const facturasUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${clienteId}&state_eq=pending`;
            const facturasResp = await fetch(facturasUrl, { headers });
            const facturasData = await facturasResp.json();
            const facturas = facturasData.data || [];

            // Encontrar la fecha de vencimiento más antigua
            facturas.forEach(f => {
                const fecha = f.first_due_date || (f.issued_at ? f.issued_at.split('T')[0] : null);
                if (fecha && (!fechaVencimiento || fecha < fechaVencimiento)) {
                    fechaVencimiento = fecha;
                }
            });
        }

        // --- RESPUESTA FINAL ---
        res.status(200).json({
            nombre: cliente.name,
            cedula: cliente.national_identification_number || cliente.taxpayer_identification_number,
            estado: contratoActivo.state || 'desconocido',
            plan: contratoActivo.plan_name || cliente.plan_name || 'Plan Básico',
            ip: contratoActivo.ip || '---',
            deuda: deuda, // DEUDA REAL según Balance C/C
            fechaVencimiento: fechaVencimiento,
            encontrado: true,
            // Info adicional del balance
            balanceInfo: {
                balanceCC: deudaReal,
                creditoDisponible: creditoDisponible,
                facturasImpagas: facturasImpagas
            }
        });

    } catch (error) {
        console.error("❌ ERROR:", error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            detalle: error.message
        });
    }
}