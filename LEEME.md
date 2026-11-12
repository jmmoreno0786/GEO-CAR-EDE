# CCTT Granada: app web instalable

Buscador de los centros de transformación del KMZ, con botones para ir hasta cada uno con la app de navegación del móvil.

## Qué hay en la carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html`, `styles.css`, `app.js` | La app |
| `data.json` | Los CT (sale del KMZ) |
| `lib/` | Librería de mapas Leaflet 1.9.4 |
| `manifest.webmanifest`, `icons/` | Hacen que se pueda instalar como app |
| `sw.js` | Guarda la app en el móvil para que abra sin cobertura |
| `herramientas/kmz_a_datos.py` | Regenera `data.json` cuando cambie el KMZ |

## Publicarla

Sube la carpeta entera a cualquier servidor web con **https**. Por ejemplo, el servidor de la empresa, GitHub Pages, Netlify o Cloudflare Pages.
Sin https, el móvil no deja instalarla ni usar la ubicación.

Ojo: los datos son ubicaciones de infraestructura eléctrica. Si la dirección es pública, cualquiera que la conozca puede verlos.
Si eso es un problema, publícala en un servidor interno o detrás de un acceso con usuario.

## Instalarla en el móvil

- **Android (Chrome):** abre la dirección, pulsa ⋮ y luego «Instalar aplicación» o «Añadir a pantalla de inicio».
- **iPhone (Safari):** abre la dirección, pulsa Compartir y luego «Añadir a pantalla de inicio».

## Actualizar los CT

1. Ejecuta `python3 herramientas/kmz_a_datos.py NUEVO.kmz data.json`
2. En `sw.js`, cambia `VERSION` (por ejemplo, pon la fecha del día).
3. Sube `data.json` y `sw.js` al servidor. Los móviles cogen la versión nueva al volver a abrir la app.

## Mapa de fondo

- Por defecto se usa el **Mapa base del IGN** y, con el botón de capas, la **ortofoto PNOA**. Las dos tienen licencia CC BY 4.0 del Instituto Geográfico Nacional.
- Si el IGN no responde, la app pasa sola a OpenStreetMap.
- Las zonas del mapa que ya se han visto quedan guardadas en el móvil (hasta unos 3.000 trozos), para cuando no hay cobertura.
