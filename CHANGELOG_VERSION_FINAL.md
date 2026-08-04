# Registro de versiones

## [4.3.2] — 2026-08-02

### Estado

Versión final con integración de **ALFACAM EN VIVO**, preparada para GitHub y Vercel.

### Cambios

- Integración mediante `iframe` permanente de la cámara pública ALFACAM.
- Ubicación identificada como **calle Bolívar, centro de San Gabriel, Carchi**.
- Nuevo encabezado: “Vea San Gabriel en tiempo real”.
- Identidad visible exclusivamente como **ALFACAM · ALFATEL**.
- Indicador “En vivo” sobre la transmisión.
- Información de ubicación, tecnología y disponibilidad.
- Carga diferida (`loading="lazy"`) para proteger el rendimiento inicial.
- Diseño adaptable a escritorio, tableta y teléfono.
- Se mantienen sin modificación los planes, precios, Zona Clientes, navegación y footer aprobados.

### Verificación requerida después del despliegue

- Confirmar reproducción en iPhone, Android y escritorio.
- Confirmar pantalla completa y estabilidad de la transmisión.
- Ejecutar Lighthouse sobre la URL pública.

## [4.3.1] — 2026-07-31

### Estado

Primera versión oficial congelada de **ALFATEL WEB 2030**, preparada para GitHub y Vercel.

### Incluye

- Diseño institucional y comercial aprobado.
- Header y hero responsivos.
- Recomendador de planes.
- Planes de fibra y servicio rural.
- ALFATEL PLAY y ALFACAM.
- Cobertura por Montúfar, Bolívar y Espejo.
- Soluciones para negocios y clientes corporativos.
- Zona Clientes.
- Footer premium.
- Menú móvil corregido.
- Modal de Zona Clientes funcional en móvil.
- Optimización de imágenes, CSS y JavaScript.
- Mejoras de Core Web Vitals.
- Accesibilidad final: foco, `inert`, navegación por teclado y restauración de foco.
- Integración serverless de consulta mediante Wispro.
- Configuración de caché y seguridad para Vercel.

### Resultados Lighthouse aprobados

- Performance: 99
- Accessibility: 100
- Best Practices: 100
- SEO: 100

### Limpieza de entrega

Se eliminaron notas parciales de desarrollo, respaldos anteriores, archivos `.source`, copias `before-footer` y lanzadores locales de Windows.

### Pendiente antes de producción

- Añadir y verificar los PDF regulatorios indicados en `legal/README_LEGAL.txt`.
- Configurar `WISPRO_API_TOKEN` en Vercel.
- Ejecutar pruebas finales sobre la URL pública.
