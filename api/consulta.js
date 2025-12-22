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
    const { cedula } = req.query;

    if (!cedula) return res.status(400).json({ error: 'Cédula requerida' });

    try {
        const headers = { 
            'Accept': 'application/json', 
            'Authorization': API_TOKEN 
        };
        const baseUrl = "https://www.cloud.wispro.co"; 
        
        // --- PASO 1: BUSCAR EL CLIENTE (Para sacar el nombre y plan) ---
        let clientes = [];
        
        // Búsqueda por Cédula
        let resp = await fetch(`${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`, { headers });
        let json = await resp.json();
        clientes = json.data || [];

        // Búsqueda por RUC (respaldo)
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

        // --- PASO 2: BUSCAR FACTURAS USANDO LA CÉDULA ---
        // Usamos la misma lógica que tu script "Laboratorio" que funcionaba bien.
        // En lugar de buscar por ID (que daba problemas), buscamos por Cédula.
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_national_identification_number_eq=${cedula}&state_eq=pending`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${clienteId}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // --- PASO 3: PROCESAR CON TU LÓGICA DE LABORATORIO ---
        let deudaTotal = 0;
        let fechaVencimiento = null;
        const facturasRaw = facturasData.data || [];

        facturasRaw.forEach(f => {
            // NOTA: Ya no filtramos por ID estricto aquí porque la búsqueda por Cédula 
            // en la URL suele ser precisa. Si Wispro te devuelve facturas, son de esa cédula.

            // Sumar deuda
            deudaTotal += parseFloat(f.balance || 0);

            // Lógica de fechas (Tu laboratorio)
            let fechaFinal = f.first_due_date;

            // Si no hay 1er vencimiento, usamos el 2do
            if (!fechaFinal) {
                fechaFinal = f.second_due_date;
            }

            // Si tampoco hay 2do, usamos fecha de creación (solo la parte YYYY-MM-DD)
            if (!fechaFinal && f.created_at) {
                fechaFinal = f.created_at.split('T')[0];
            }

            // DETERMINAR LA FECHA A MOSTRAR (La más antigua)
            if (fechaFinal) {
                if (!fechaVencimiento) {
                    fechaVencimiento = fechaFinal;
                } 
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
            fechaVencimiento: fechaVencimiento,
            encontrado: true
        });

    } catch (error) {
        console.error("Error API:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}