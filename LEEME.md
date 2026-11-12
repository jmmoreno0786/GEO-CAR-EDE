# CCTT Granada: app web instalable

Buscador de los centros de transformación, los elementos de maniobra y los apoyos de MT, con botones para ir hasta cada uno con la app de navegación del móvil.

## Qué hay en la carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html`, `styles.css`, `app.js` | La app |
| `data.json` | CT, elementos de maniobra y apoyos de MT (sale de los KMZ) |
| `lib/` | Librería de mapas Leaflet 1.9.4 |
| `manifest.webmanifest`, `icons/` | Hacen que se pueda instalar como app |
| `sw.js` | Guarda la app en el móvil para que abra sin cobertura |
| `herramientas/kmz_a_datos.py` | Regenera `data.json` cuando cambien los KMZ |

## Publicarla

Sube la carpeta entera a cualquier servidor web con **https**. Por ejemplo, el servidor de la empresa, GitHub Pages, Netlify o Cloudflare Pages.
Sin https, el móvil no deja instalarla ni usar la ubicación.

Ojo: los datos son ubicaciones de infraestructura eléctrica. Si la dirección es pública, cualquiera que la conozca puede verlos.
Si eso es un problema, publícala en un servidor interno o detrás de un acceso con usuario.

## Instalarla en el móvil

- **Android (Chrome):** abre la dirección, pulsa ⋮ y luego «Instalar aplicación» o «Añadir a pantalla de inicio».
- **iPhone (Safari):** abre la dirección, pulsa Compartir y luego «Añadir a pantalla de inicio».

## Actualizar los datos

1. Ejecuta `python3 herramientas/kmz_a_datos.py data.json CDs.kmz Elementos_de_maniobra.kmz Apoyos_MT.kmz`.
   Puedes pasarle solo alguno de los KMZ: las demás capas se conservan como estaban.
2. En `sw.js`, cambia `VERSION` (por ejemplo, pon la fecha del día).
3. Sube `data.json` y `sw.js` al servidor. Los móviles cogen la versión nueva al volver a abrir la app.

## Capas

- **CT Endesa** y **CT externos** salen encendidas al abrir la app.
- **Maniobra** y **Apoyos MT** salen apagadas. Al encenderlas solo se dibujan los de la zona visible, con el mapa acercado.
- El buscador encuentra elementos de todas las capas, estén encendidas o no.

## Mapa de fondo

- Por defecto se usa el **Mapa base del IGN** y, con el botón de capas, la **ortofoto PNOA**. Las dos tienen licencia CC BY 4.0 del Instituto Geográfico Nacional.
- Si el IGN no responde, la app pasa sola a OpenStreetMap.
- Las zonas del mapa que ya se han visto quedan guardadas en el móvil (hasta unos 3.000 trozos), para cuando no hay cobertura.
