# ALFATEL V3 — qué cambió y por qué

Cada cambio viene de la matriz comparativa. Aquí queda registrado el motivo,
para que dentro de seis meses se sepa por qué está cada cosa donde está.

---

## Cambios de fondo

### 1. Precio final con IVA visible
**De dónde viene:** Netlife y Claro muestran el valor con y sin IVA lado a lado.
Telenlaces estampa «PRECIO FINAL» sobre cada plan.
**El problema:** el cliente que esperaba $15 recibía una factura de $17,25 y la
primera llamada del mes era un reclamo.
**Cómo quedó:** el número grande es el final. El valor base aparece debajo, en
letra pequeña, para que el cliente pueda comparar con la competencia.
**El giro propio:** el sello «no sube al cuarto mes». Netlife no puede escribir
eso porque descuenta el 50 % solo en las nueve primeras facturas.

### 2. Velocidad visible sin rendir la narrativa
**De dónde viene:** todos los referentes ponen los Mbps al frente. Es la unidad
con la que compara el comprador ecuatoriano.
**El problema:** los planes se llamaban CONECTA, AVANZA o PLAY pero no decían la
velocidad. Quien no puede comparar, desconfía.
**Cómo quedó:** nombre grande, velocidad como dato de apoyo en una etiqueta.
Se conserva la narrativa de estilo de vida, que es lo que diferencia a ALFATEL,
pero ya no se esconde el dato duro.

### 3. «Sin permanencia» pasó a ser el titular
**De dónde viene:** Google Fiber es el ISP mejor calificado de Estados Unidos en
buena parte por no tener contrato. Init7 cobra un precio único y punto.
**El problema:** Netlife amarra 36 meses, Fibramax 24, Opticom 36. ALFATEL no
amarra a nadie y lo decía en una etiqueta diminuta.
**Cómo quedó:** está en el subtítulo del hero, en el sello de cada plan, en las
condiciones escritas y en las preguntas frecuentes.
**El giro propio:** dicho en términos del cliente rural — «si se muda, se cambia
o no le gusta, se va sin multa» — en vez del genérico «sin cláusula».

### 4. La consulta de deuda ahora termina en un pago
**De dónde viene:** Megatel remata con «Pagar factura ahora». Netlife envía un
enlace de pago por WhatsApp.
**El problema:** la versión anterior mostraba el valor y ahí se detenía. El
cliente ya tenía la billetera en la mano y se lo soltaba.
**Cómo quedó:** el botón abre WhatsApp con el nombre, la cédula, el monto y el
número de facturas ya escritos. Además hay una sección completa de formas de pago.
**El giro propio:** sin pasarela de pago costosa. La transferencia con comprobante
por WhatsApp es lo que ya usa la gente en la zona.

### 5. Verificador de cobertura
**De dónde viene:** Google Fiber e Hyperoptic organizan todo el sitio alrededor
de «¿llega a mi dirección?». Xtrim promete validar en menos de cinco minutos.
**El problema:** había once nombres de sectores en pantalla. Quien vivía en un
anejo que no aparecía se iba sin preguntar.
**Cómo quedó:** formulario de tres campos que arma un mensaje completo de WhatsApp.
**El giro propio:** para el campo se pide una foto del horizonte desde donde iría
la antena. Nadie lo hace. Resuelve la línea de vista antes de mover al técnico y
ahorra viajes en vano.

### 6. Preguntas frecuentes
**De dónde viene:** Megatel publica once preguntas y todas son reales.
**El problema:** esas mismas preguntas llegaban una por una al WhatsApp del negocio.
**Cómo quedó:** once preguntas en acordeón.
**El giro propio:** cuatro de ellas son rurales y ningún competidor las explica —
qué es la línea de vista, qué pasa si crece un árbol frente a la antena, qué ocurre
cuando se va la luz, y por qué el WiFi no llega a toda la casa.

### 7. Bloque de normas y regulaciones
**De dónde viene:** AFNet, Telenlaces y Megatel enlazan ARCOTEL, contrato de
adhesión, normas de calidad, reglamento de abonados y control parental.
**El problema:** ALFATEL solo publicaba política de privacidad. Es un
incumplimiento regulatorio y una señal de informalidad ante clientes corporativos.
**Cómo quedó:** bloque completo en el pie, apuntando a la carpeta `/legal`.

### 8. Aviso antifraude
**De dónde viene:** Netlife advierte que nunca solicita claves ni pagos a cuentas
personales.
**El problema:** el sitio pide cédula. Sin ese aviso, cualquiera puede suplantar
la marca por WhatsApp.
**Cómo quedó:** aparece dentro del modal de consulta y en la sección de pagos.

### 9. La cámara pública volvió
**De dónde viene:** de nadie. Esto lo inventó ALFATEL y estaba en el sitio
publicado; la versión anterior del código lo había eliminado.
**Por qué importa:** es la única sección que no promete nada, sino que demuestra.
Ningún competidor puede responder a eso con texto.
**Cómo quedó:** con el marco, la insignia de «en vivo» y un espacio marcado para
pegar el reproductor.

### 10. Prueba social y condiciones por escrito
**De dónde viene:** Xtrim publica testimonios con nombre y ciudad. Netlife declara
tiempo de reparación y costo de traslado.
**Cómo quedó:** tres testimonios y una tabla de seis condiciones.
**El giro propio:** el compromiso de respuesta el mismo día, que un operador
nacional no puede igualar porque su técnico está en Quito.

### 11. Un solo mensaje central
**El problema:** el sitio decía ocho cosas a la vez y ninguna se quedaba.
**Cómo quedó:** «El internet de aquí». Es lo único que ningún competidor nacional
puede copiar, porque no se compra con inversión sino con años.

---

## Cambios técnicos

### Se eliminó el paso de compilación
Antes: Vite + Tailwind + lucide, con `npm install` obligatorio para ver la página.
Ahora: HTML, CSS y JavaScript puro, sin dependencias.

**Por qué:**
- Se puede abrir con doble clic, sin instalar nada.
- Menos piezas que se rompan cuando una librería se actualice.
- Carga más rápido, lo que importa en conexiones rurales.
- Cualquier persona puede editar un texto sin saber compilar.

Los iconos de lucide se reemplazaron por SVG en línea. Se usan quince y no hacía
falta una librería entera para eso.

### Se permite el zoom
El `<meta viewport>` anterior tenía `user-scalable=no, maximum-scale=1.0`, que
impide ampliar el texto. En una zona con población adulta mayor es un error caro.
Se quitó.

### Se arreglaron los enlaces sociales
Antes apuntaban a `#`. Ahora van a facebook.com/AlfaTelSG. Un ícono muerto es peor
que no tenerlo: sugiere abandono.

### El endpoint de Wispro quedó intacto
`api/consulta.js` es exactamente el mismo archivo. No se tocó una línea, para no
romper la integración que ya funciona. Sigue esperando la variable de entorno
`WISPRO_API_TOKEN`.

### El número de WhatsApp está en un solo lugar
`js/app.js`, constante `CONFIG.telefono`. Antes estaba repetido por todo el HTML.

---

## Lo que quedó pendiente

Son las decisiones de prioridad 3 de la matriz, que requieren más trabajo:

- **Página de estado de red e interrupciones programadas.** Ningún ISP del Carchi
  la tiene. Es el diferenciador de transparencia más barato que queda disponible.
- **Reportar una falla desde la web** usando la cédula que ya está integrada con
  Wispro, para que el reporte caiga en la ruta del técnico del día.
- **Revisar la gama alta.** Telenlaces ofrece 1000 Mbps por $30 en Tulcán. El plan
  TOTAL de 600 Mbps a $30 queda expuesto en una comparación directa. En este
  rediseño se mitigó cambiando el argumento — TOTAL se presenta como hogar
  conectado y vigilado, no como plan de internet — pero la decisión comercial de
  fondo sigue pendiente.

## V1.1 — Negocios y Corporativo final
- Texto introductorio enfocado en soluciones adaptadas a cada empresa.
- Identificación clara del público de ALFATEL NEGOCIOS.
- Refuerzo del acompañamiento técnico en ALFATEL CORPORATIVO.
- Nota de asesoría gratuita y sin compromiso junto al CTA principal.
- Bloque aprobado y congelado.


## V1.2 — Zona Clientes (primera versión)
- Nuevo centro de accesos para cuenta, pagos, soporte y atención.
- Se conserva la consulta existente mediante API de Wispro.
- Nuevos mensajes de WhatsApp especializados.
- Mensaje de seguridad reforzado.

## V1.3 — Zona Clientes V2
- Rediseño como Centro de Atención ALFATEL.
- Accesos rápidos tipo aplicación.
- Consulta compacta con CTA naranja y seguridad reforzada.
- Integración /api/consulta conservada.


## V1.4 — Zona Clientes V3 final
- Ajustes finales de textos, iconos y animaciones.
- Nuevo bloque de ayuda inmediata: llamada, WhatsApp y oficina.
- Zona Clientes marcada como aprobada y congelada.

## V1.5 — Footer Premium (primera versión)
- Rediseño integral del pie de página con identidad institucional.
- Logo oficial, promesa de marca y sello de 16 años.
- Enlaces organizados para servicios, cobertura, atención y contacto.
- Accesos directos a teléfono, WhatsApp, oficina y redes oficiales.
- Franja final de contacto, enlaces regulatorios y botón Volver arriba.
- Diseño responsive con fondo premium y patrón tecnológico sutil.
- Estado: EN REVISIÓN.


## V1.6 — Footer Premium V2 Final
- Se incorporaron cinco refinamientos Signature: brillo del logo, línea de fibra animada, microanimaciones de iconos, pulso contextual del botón Volver arriba y frase institucional final.
- Bloque Footer declarado aprobado y congelado.


## V2.1 — Responsive Premium: Header + Hero

- Se optimizó la navegación para tablet y móvil.
- Se añadieron áreas táctiles mínimas de 44 px.
- Se mejoró la accesibilidad del menú móvil con `aria-expanded` y `aria-hidden`.
- Se adaptaron tipografía, CTA, imagen, beneficios y estadísticas del hero para 320 px–4K.
- Se añadió precarga y tamaño explícito de la imagen principal.
- Se respetan las preferencias de movimiento reducido.
- Estado: **EN REVISIÓN**.

## V3.1 — Optimización de imágenes

- Hero convertido a AVIF y WebP responsive en 480 px y 722 px.
- Se añadió `<picture>` con selección automática del formato compatible.
- Se corrigieron las dimensiones intrínsecas del Hero a 722 × 535 para reducir cambios de diseño.
- La imagen principal conserva `fetchpriority="high"` y precarga responsive.
- Se añadieron favicons optimizados de 32 × 32 y 180 × 180.
- Logos secundarios usan carga diferida y decodificación asíncrona.
- No se modificó el diseño visual ni el contenido aprobado.

## V3.2 — Optimización CSS

- Se conserva `css/style.source.css` como hoja editable y documentada.
- `css/style.css` pasa a ser la versión optimizada para producción.
- Reducción de 74.083 a 68.972 bytes (6,9 %) sin cambios visuales intencionales.
- Validación sintáctica del CSS completada.
- Se agregó versión de caché `?v=3.2` en las páginas HTML.
- Se configuró caché prolongada para `/css/` y `/assets/` en Vercel.
- Estado: **EN REVISIÓN**.

## V3.3 — Optimización JavaScript
- Archivo fuente legible: `js/app.source.js`.
- Archivo de producción optimizado: `js/app.js`.
- Carga no bloqueante mediante `defer`.
- Versionado de caché `?v=3.3`.
- Sin cambios funcionales ni visuales.

## V3.3.1 — Corrección menú móvil
- Retirado `defer` del script principal, que ya se carga al final de `<body>`.
- Actualizado el identificador de caché a `app.js?v=3.3.1`.
- Sin cambios de diseño, CSS, imágenes o contenido.


## V3.4 — Core Web Vitals y carga inicial
- Carga no bloqueante de Google Fonts con respaldo noscript.
- DNS prefetch y preconnect para tipografías.
- content-visibility para secciones fuera de pantalla.
- Prioridades de carga ajustadas para favorecer el LCP del Hero.
- Caché de JavaScript y revalidación de HTML en Vercel.
- Versionado de recursos actualizado a 3.4.

## V4.1 — Optimización JavaScript Performance
- Inicialización por demanda de módulos no críticos.
- Unificación de listeners delegados.
- Animaciones y observadores diferidos hasta la primera interacción.
- Menor trabajo del hilo principal durante LCP.
- Sin cambios visuales ni comerciales.

## V4.2 — Optimización de imágenes para Performance

- Se generaron variantes WebP transparentes del logo oficial en 152, 190 y 304 px.
- Header, menú móvil y footer utilizan `srcset` y `sizes` para descargar el tamaño adecuado.
- Se conserva el PNG oficial como archivo maestro y respaldo del proyecto.
- No se modificó el diseño ni la funcionalidad.
- Objetivo: reducir la oportunidad Lighthouse “Improve image delivery”.
