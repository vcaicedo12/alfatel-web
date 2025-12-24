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

        // --- PASO 2: BUSCAR TODAS LAS FACTURAS (NO SOLO PENDING) ---
        // CAMBIO CRÍTICO: Removemos el filtro state_eq=pending
        // Traemos TODAS las facturas y filtramos por balance > 0
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${clienteId}`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${clienteId}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // --- PASO 3: SUMA INTELIGENTE CON BALANCE ---
        let deudaTotal = 0;
        let fechaVencimiento = null;
        const facturasRaw = facturasData.data || [];
        let facturasProcesadas = 0;
        let facturasConDeuda = 0;

        console.log(`🧾 Total de facturas encontradas: ${facturasRaw.length}`);

        facturasRaw.forEach(f => {
            // CAMBIO: Convertir balance a número de forma segura
            const balance = parseFloat(f.balance || 0);
            
            // FILTRO PRINCIPAL: Solo procesamos facturas con saldo pendiente
            if (balance <= 0) {
                return; // Saltar facturas pagadas o sin deuda
            }

            // Verificar que no esté anulada
            if (f.state === 'void') {
                console.log(`🗑️ Ignorando factura anulada: ${f.invoice_number}`);
                return;
            }

            // OPCIONAL: Filtro de año (pero menos agresivo)
            // Solo ignoramos facturas muy antiguas (más de 5 años)
            const fechaStr = f.created_at || f.issued_at;
            if (fechaStr) {
                const anioFactura = new Date(fechaStr).getFullYear();
                const anioActual = new Date().getFullYear();
                
                // Si la factura tiene más de 5 años, podría ser un error
                if (anioActual - anioFactura > 5) {
                    console.log(`⚠️ Factura muy antigua (${anioFactura}): ${f.invoice_number} - Balance: $${balance}`);
                    // Decidir si incluirla o no según tu política
                    // return; // Descomentar para ignorarlas
                }
            }

            // Sumar el saldo
            deudaTotal += balance;
            facturasConDeuda++;
            
            console.log(`💰 Factura #${f.invoice_number}: Balance $${balance} | Estado: ${f.state}`);

            // Calcular fecha de vencimiento más antigua
            let fechaFinal = f.first_due_date || (f.issued_at ? f.issued_at.split('T')[0] : null);
            if (fechaFinal) {
                if (!fechaVencimiento || fechaFinal < fechaVencimiento) {
                    fechaVencimiento = fechaFinal;
                }
            }
            
            facturasProcesadas++;
        });

        console.log(`✅ Facturas procesadas: ${facturasProcesadas}`);
        console.log(`💵 Facturas con deuda: ${facturasConDeuda}`);
        console.log(`💰 Deuda total calculada: $${deudaTotal}`);

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
            deuda: parseFloat(deudaTotal.toFixed(2)), // Redondear a 2 decimales
            fechaVencimiento: fechaVencimiento,
            encontrado: true,
            // Debug info (puedes comentar en producción)
            debug: {
                totalFacturas: facturasRaw.length,
                facturasConDeuda: facturasConDeuda,
                clienteId: clienteId
            }
        });

    } catch (error) {
        console.error("❌ Error API:", error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            detalle: error.message 
        });
    }
}