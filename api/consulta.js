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

    // LIMPIEZA: Quitamos espacios
    cedula = cedula.toString().replace(/\s+/g, '');

    try {
        const headers = { 'Accept': 'application/json', 'Authorization': API_TOKEN };
        const baseUrl = "https://www.cloud.wispro.co"; 
        
        // --- PASO 1: ENCONTRAR AL CLIENTE ---
        let clientes = [];
        let resp = await fetch(`${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`, { headers });
        let json = await resp.json();
        clientes = json.data || [];

        // Intento RUC
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

        // --- PASO 2: BUSCAR FACTURAS ---
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${clienteId}&state_eq=pending`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${clienteId}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // --- PASO 3: SUMAR SOLO LO ACTUAL ---
        let deudaTotal = 0;
        let fechaVencimiento = null;
        const facturasRaw = facturasData.data || [];

        // Año actual para referencia
        const anioActual = new Date().getFullYear(); // 2025

        facturasRaw.forEach(f => {
            // Obtenemos el año de la factura
            const fechaStr = f.created_at; 
            const anioFactura = new Date(fechaStr).getFullYear();

            // --- EL FILTRO SALVAVIDAS ---
            // Si la factura es del 2021 o anterior, NO LA SUMAMOS.
            // Solo sumamos 2022, 2023, 2024, 2025.
            if (anioFactura <= 2021) {
                return; // Ignorar basura vieja
            }

            // Si llegamos aquí, la factura es reciente. SUMAMOS EL DINERO.
            deudaTotal += parseFloat(f.balance || 0);

            // Calcular fecha para mostrar al cliente
            let fechaFinal = f.first_due_date || f.created_at.split('T')[0];
            if (fechaFinal) {
                if (!fechaVencimiento || fechaFinal < fechaVencimiento) {
                    fechaVencimiento = fechaFinal;
                }
            }
        });

        // Redondeamos a 2 decimales para que se vea como dinero (ej: 20.00)
        deudaTotal = Math.round(deudaTotal * 100) / 100;

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
            deuda: deudaTotal, // ¡Aquí saldrá el valor correcto ($20 o $60)!
            fechaVencimiento: fechaVencimiento,
            encontrado: true
        });

    } catch (error) {
        console.error("Error API:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}