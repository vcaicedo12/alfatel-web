export default async function handler(req, res) {
    // 1. Configuración CORS (Igual que siempre)
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
        
        // Búsqueda principal
        let resp = await fetch(`${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`, { headers });
        let json = await resp.json();
        clientes = json.data || [];

        // Búsqueda de respaldo (RUC)
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

        console.log(`✅ Cliente: ${cliente.name} (ID: ${clienteId})`);

        // --- PASO 2: BUSCAR FACTURAS ---
        // Traemos todas las pendientes de este ID
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${clienteId}&state_eq=pending`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${clienteId}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // --- PASO 3: PROCESAR CON TU LÓGICA DE LABORATORIO ---
        let deudaTotal = 0;
        let fechaVencimiento = null; // Aquí guardaremos la fecha más antigua encontrada
        const facturasRaw = facturasData.data || [];

        facturasRaw.forEach(f => {
            // A) FILTRO DE SEGURIDAD (Para no mezclar clientes)
            if (String(f.client_id) !== String(clienteId)) {
                return; // Ignoramos si el ID no coincide
            }

            // B) SUMAR DEUDA
            deudaTotal += parseFloat(f.balance || 0);

            // C) TU LÓGICA DE FECHAS (Tal cual tu script)
            let fechaFinal = f.first_due_date;

            // Si no hay 1er vencimiento, usamos el 2do
            if (!fechaFinal) {
                fechaFinal = f.second_due_date;
            }

            // Si tampoco hay 2do, usamos fecha de creación (solo la parte YYYY-MM-DD)
            if (!fechaFinal && f.created_at) {
                fechaFinal = f.created_at.split('T')[0];
            }

            // D) DETERMINAR LA FECHA A MOSTRAR (La más antigua/próxima a vencer)
            if (fechaFinal) {
                // Si aún no tenemos fecha guardada, tomamos esta
                if (!fechaVencimiento) {
                    fechaVencimiento = fechaFinal;
                } 
                // Si esta fecha es MENOR (anterior) a la que ya teníamos, la actualizamos
                // (Ej: Si teníamos 20-Oct y esta factura es del 15-Oct, mostramos 15-Oct)
                else if (fechaFinal < fechaVencimiento) {
                    fechaVencimiento = fechaFinal;
                }
            }
        });

        // --- PASO 4: RESPONDER ---
        const contratos = contratosData.data || [];
        const contratoActivo = contratos.find(c => c.state === 'enabled') || contratos[0] || {};
        
        res.status(200).json({
            nombre: cliente.name,
            estado: contratoActivo.state || 'desconocido',
            plan: contratoActivo.plan_name || cliente.plan_name || 'Plan Básico',
            ip: contratoActivo.ip || '---',
            deuda: deudaTotal,
            fechaVencimiento: fechaVencimiento, // Ahora devuelve la fecha calculada con tu lógica
            encontrado: true
        });

    } catch (error) {
        console.error("Error API:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}