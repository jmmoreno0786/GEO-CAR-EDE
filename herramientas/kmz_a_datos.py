"""Genera data.json a partir del KMZ de CCTT.

Uso:  python3 herramientas/kmz_a_datos.py CDs.kmz data.json

Lee las carpetas «Nombres CCTT ENDESA» (código + posición) y «CCTT EXTERNOS»
(código + posición + ficha de la descripción). Después sube el data.json nuevo
al servidor y cambia VERSION en sw.js para que los móviles lo descarguen.
"""
import sys, re, json, zipfile, xml.etree.ElementTree as ET

K = '{http://www.opengis.net/kml/2.2}'

def main(kmz, out):
    with zipfile.ZipFile(kmz) as z:
        name = next(n for n in z.namelist() if n.lower().endswith('.kml'))
        root = ET.fromstring(z.read(name))
    folders = {f.get('id') or f.findtext(K + 'name'): f for f in root.iter(K + 'Folder')}

    def pt(p):
        lon, lat = p.find('.//' + K + 'coordinates').text.strip().split(',')[:2]
        return round(float(lat), 6), round(float(lon), 6)

    endesa = []
    for p in folders['Nombres CCTT ENDESA'].findall(K + 'Placemark'):
        lat, lon = pt(p)
        endesa.append([p.findtext(K + 'name'), lat, lon])

    fields, ext = None, []
    for p in folders['CCTT EXTERNOS'].findall(K + 'Placemark'):
        rows = re.findall(r'<tr[^>]*><td>(.*?)</td><td>(.*?)</td></tr>', p.findtext(K + 'description') or '')
        if fields is None:
            fields = [r[0] for r in rows]
        vals = dict(rows)
        lat, lon = pt(p)
        ext.append([p.findtext(K + 'name'), lat, lon] + [vals.get(f, '') for f in fields])

    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'fields': fields, 'endesa': endesa, 'ext': ext}, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(endesa)} CT Endesa y {len(ext)} CT externos escritos en {out}')

if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
