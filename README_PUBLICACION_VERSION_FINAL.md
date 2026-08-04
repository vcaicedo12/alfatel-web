# ALFATEL WEB 2030

**Versión oficial congelada:** `V4.3.2 FINAL`  
**Destino:** GitHub + Vercel  
**Estado:** aprobada, estable y lista para publicación.

## Tecnología

Sitio estático construido con HTML, CSS y JavaScript puro. No requiere compilación ni framework.

Incluye una función serverless en `api/consulta.js` para la consulta integrada con Wispro.

## Estructura principal

```text
index.html
politica.html
assets/
css/
js/
api/
legal/
vercel.json
package.json
```

## Prueba local

Requiere Node.js instalado.

```bash
npm install
npm run dev
```

Abrir en el navegador:

```text
http://localhost:5173
```

## Publicación en GitHub

```bash
git init
git add .
git commit -m "Release v4.3.2 FINAL"
git branch -M main
git remote add origin <URL_DEL_REPOSITORIO>
git push -u origin main
```

Se recomienda crear el tag estable:

```bash
git tag -a v4.3.2-final -m "ALFATEL WEB 2030 V4.3.2 FINAL"
git push origin v4.3.2-final
```

## Configuración en Vercel

- Framework Preset: **Other**
- Root Directory: raíz del repositorio
- Build Command: **vacío**
- Output Directory: **vacío**
- Install Command: puede dejarse por defecto

El archivo `vercel.json` ya contiene encabezados de seguridad y caché.

## Variable de entorno obligatoria

La función `api/consulta.js` utiliza:

```text
WISPRO_API_TOKEN
```

Debe configurarse en Vercel desde:

**Project Settings → Environment Variables**

No se debe escribir el token dentro del código ni subirlo a GitHub.

## Documentos legales pendientes

La carpeta `legal/` contiene las instrucciones y nombres exactos de los PDF requeridos. Antes de la publicación oficial se debe verificar si están presentes:

- `contrato-de-adhesion.pdf`
- `normas-de-calidad.pdf`
- `reglamento-abonados.pdf`
- `control-parental.pdf`

Si no se cargan, los enlaces correspondientes devolverán error 404.

## Verificación previa a producción

1. Abrir la página desde computadora, iPhone y Android.
2. Probar menú móvil y Zona Clientes.
3. Probar enlaces de WhatsApp.
4. Probar consulta de cuenta con la variable Wispro configurada.
5. Revisar enlaces legales.
6. Ejecutar Lighthouse sobre la URL pública.
7. Confirmar HTTPS y dominio `alfatel.net`.

## Resultados aprobados en Lighthouse

- Performance: **99**
- Accessibility: **100**
- Best Practices: **100**
- SEO: **100**

## Control de versión

Esta carpeta corresponde a la primera versión oficial congelada. Las nuevas funcionalidades deben desarrollarse en una rama o versión posterior, sin modificar el tag `v4.3.2-final`.


## ALFACAM EN VIVO

La versión 4.3.2 incorpora la cámara pública de la calle Bolívar, centro de San Gabriel, mediante un iframe permanente de marca blanca. La transmisión utiliza carga diferida para reducir su impacto en el rendimiento inicial.
