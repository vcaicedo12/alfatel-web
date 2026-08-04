# ALFATEL V4.3.2 FINAL sobre Vite

## Reemplazar en el repositorio actual
Copie todo el contenido de esta carpeta en la raíz del repositorio Vite existente y acepte **Reemplazar archivos**.

## Eliminar del proyecto anterior
Estos archivos ya no se usan y pueden eliminarse:
- `src/js/api.js`
- `src/js/auth.js`
- `src/js/firebase.js`
- `public/logo-alfatel.png`
- `public/politica.html`
- `public/vite.svg`

No elimine la carpeta oculta `.git`.

## Ejecutar localmente
```powershell
npm install
npm run dev
```

La parte visual funcionará con Vite. Para probar también la función `/api/consulta` use:
```powershell
npm run dev:vercel
```

## Publicar
```powershell
git add -A
git commit -m "Publicar ALFATEL WEB V4.3.2 FINAL"
git push origin main
```

Vercel actualizará el proyecto conectado a esa rama.

## Variable de entorno requerida en Vercel
- `WISPRO_API_TOKEN`
