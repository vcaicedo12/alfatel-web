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

        // Si falla, intentamos agregando 001 (RUC)
        if (clientes.length === 0) {
            resp = await fetch(`${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula + '001'}`, { headers });
            json = await resp.json();
            clientes = json.data || [];
        }

        // Si falla, intentamos RUC directo
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

        // --- PASO 2: BUSCAR FACTURAS PENDIENTES ---
        // Aquí aplicamos tu lógica: state_eq=pending nos trae SOLO lo que no está pagado.
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${clienteId}&state_eq=pending`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${clienteId}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // --- PASO 3: SUMA INTELIGENTE ---
        let deudaTotal = 0;
        let fechaVencimiento = null;
        const facturasRaw = facturasData.data || [];

        console.log(`🧾 Facturas pendientes encontradas: ${facturasRaw.length}`);

        facturasRaw.forEach(f => {
            // A) Verificar fecha para evitar el error de $456 del 2021
            // Usamos created_at porque siempre existe. first_due_date a veces viene vacío.
            const fechaStr = f.created_at; 
            const anioFactura = new Date(fechaStr).getFullYear();

            // REGLA DE SEGURIDAD:
            // Si la factura es del 2021 o anterior, la consideramos "Basura" y la saltamos.
            // Aceptamos 2022, 2023, 2024, 2025...
            if (anioFactura <= 2021) {
                console.log(`🗑️ Ignorando factura antigua del año ${anioFactura} (Monto: ${f.balance})`);
                return;
            }

            // B) Sumar el saldo (balance)
            // Wispro a veces devuelve strings, aseguramos que sea número
            deudaTotal += parseFloat(f.balance || 0);

            // C) Calcular fecha de vencimiento más antigua
            let fechaFinal = f.first_due_date || f.created_at.split('T')[0];
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
            deuda: deudaTotal, // Deuda filtrada
            fechaVencimiento: fechaVencimiento,
            encontrado: true
        });

    } catch (error) {
        console.error("Error API:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}