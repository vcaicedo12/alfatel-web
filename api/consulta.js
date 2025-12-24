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

    // LIMPIEZA AGRESIVA: Quitamos TODOS los caracteres no numéricos
    cedula = cedula.toString().replace(/\D/g, '');

    try {
        const headers = { 'Accept': 'application/json', 'Authorization': API_TOKEN };
        const baseUrl = "https://www.cloud.wispro.co"; 
        
        // --- PASO 1: ENCONTRAR AL CLIENTE (MÚLTIPLES INTENTOS) ---
        let clientes = [];
        let intentos = [
            // Intento 1: Por cédula exacta
            `${baseUrl}/api/v1/clients?national_identification_number_eq=${cedula}`,
            // Intento 2: Por RUC con 001
            `${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula}001`,
            // Intento 3: Por RUC directo
            `${baseUrl}/api/v1/clients?taxpayer_identification_number_eq=${cedula}`,
            // Intento 4: Búsqueda parcial por cédula (contains)
            `${baseUrl}/api/v1/clients?national_identification_number_cont=${cedula}`,
        ];

        for (let url of intentos) {
            const resp = await fetch(url, { headers });
            const json = await resp.json();
            if (json.data && json.data.length > 0) {
                clientes = json.data;
                console.log(`✅ Cliente encontrado con: ${url}`);
                break;
            }
        }

        if (clientes.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado con cédula: ' + cedula });
        }

        const cliente = clientes[0];
        const clienteId = cliente.id;

        console.log(`👤 Cliente: ${cliente.name} | ID: ${clienteId}`);

        // --- PASO 2: BUSCAR FACTURAS Y CONTRATOS ---
        const invoicesUrl = `${baseUrl}/api/v1/invoicing/invoices?client_id_eq=${clienteId}`;
        const contractsUrl = `${baseUrl}/api/v1/contracts?client_id_eq=${clienteId}`;

        const [facturasResp, contratosResp] = await Promise.all([
            fetch(invoicesUrl, { headers }),
            fetch(contractsUrl, { headers })
        ]);

        if (!facturasResp.ok) {
            throw new Error(`Error al obtener facturas: ${facturasResp.status}`);
        }

        const facturasData = await facturasResp.json();
        const contratosData = await contratosResp.json();

        // --- PASO 3: CALCULAR DEUDA REAL ---
        let deudaTotal = 0;
        let fechaVencimiento = null;
        const facturasRaw = facturasData.data || [];
        let facturasConDeuda = [];

        console.log(`📊 Total de facturas encontradas: ${facturasRaw.length}`);

        // Procesar TODAS las facturas
        for (let i = 0; i < facturasRaw.length; i++) {
            const f = facturasRaw[i];
            
            // Convertir balance de forma segura
            let balance = 0;
            if (f.balance !== null && f.balance !== undefined && f.balance !== '') {
                balance = parseFloat(String(f.balance).replace(/[^0-9.-]/g, ''));
            }

            // Log de CADA factura para debugging
            console.log(`📄 Factura #${f.invoice_number || 'N/A'}: Balance=$${balance} | Estado=${f.state}`);

            // Filtros de exclusión
            if (f.state === 'void') {
                console.log(`   ↳ ❌ Anulada - ignorada`);
                continue;
            }

            if (f.state === 'draft') {
                console.log(`   ↳ ❌ Borrador - ignorada`);
                continue;
            }

            if (isNaN(balance) || balance <= 0) {
                console.log(`   ↳ ✅ Sin deuda - ignorada`);
                continue;
            }

            // Esta factura tiene deuda real
            console.log(`   ↳ 💰 DEUDA DETECTADA: $${balance}`);
            
            deudaTotal += balance;
            facturasConDeuda.push({
                numero: f.invoice_number,
                balance: balance,
                estado: f.state,
                fecha: f.issued_at || f.created_at
            });

            // Calcular fecha de vencimiento más antigua
            const fechaFinal = f.first_due_date || (f.issued_at ? f.issued_at.split('T')[0] : null);
            if (fechaFinal) {
                if (!fechaVencimiento || fechaFinal < fechaVencimiento) {
                    fechaVencimiento = fechaFinal;
                }
            }
        }

        console.log(`\n💵 RESUMEN:`);
        console.log(`   Total facturas: ${facturasRaw.length}`);
        console.log(`   Facturas con deuda: ${facturasConDeuda.length}`);
        console.log(`   💰 DEUDA TOTAL: $${deudaTotal.toFixed(2)}`);

        // --- PASO 4: OBTENER INFO DEL CONTRATO ---
        const contratos = contratosData.data || [];
        let contratoActivo = contratos.find(c => c.state === 'enabled');
        if (!contratoActivo) contratoActivo = contratos.find(c => c.state === 'disabled');
        contratoActivo = contratoActivo || {};

        // --- RESPUESTA FINAL ---
        const respuesta = {
            nombre: cliente.name,
            cedula: cliente.national_identification_number || cliente.taxpayer_identification_number,
            estado: contratoActivo.state || 'desconocido',
            plan: contratoActivo.plan_name || cliente.plan_name || 'Plan Básico',
            ip: contratoActivo.ip || '---',
            deuda: parseFloat(deudaTotal.toFixed(2)),
            fechaVencimiento: fechaVencimiento,
            encontrado: true,
            // Información detallada para debugging
            detalleFacturas: facturasConDeuda,
            resumen: {
                totalFacturas: facturasRaw.length,
                facturasConDeuda: facturasConDeuda.length,
                clienteId: clienteId
            }
        };

        res.status(200).json(respuesta);

    } catch (error) {
        console.error("❌ ERROR GENERAL:", error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            detalle: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}