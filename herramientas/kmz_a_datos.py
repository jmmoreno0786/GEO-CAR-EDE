"""Genera data.json a partir de los KMZ de CCTT, elementos de maniobra y apoyos de MT.

Uso:  python3 herramientas/kmz_a_datos.py data.json CDs.kmz Elementos_de_maniobra.kmz Apoyos_MT.kmz

Se le pueden pasar uno o varios KMZ: cada capa se busca por el nombre de su carpeta.
  - «Nombres CCTT ENDESA»  -> CT de Endesa (código + posición)
  - «CCTT EXTERNOS»        -> CT externos (código + posición + ficha)
  - «DDMM_sub»             -> elementos de maniobra (código + posición + ficha)
  - «Apoyo MT ENDESA»      -> apoyos de MT (código + posición + ficha)
Si un KMZ no trae una capa, se conserva la que ya hubiera en data.json.
Después sube el data.json nuevo y cambia VERSION en sw.js para que los móviles lo descarguen.
"""
import sys, os, re, json, zipfile, xml.etree.ElementTree as ET

K = '{http://www.opengis.net/kml/2.2}'
ROW = re.compile(r'<tr[^>]*><td>(.*?)</td><td>(.*?)</td></tr>', re.S)


def folders_of(kmz):
    with zipfile.ZipFile(kmz) as z:
        name = next(n for n in z.namelist() if n.lower().endswith('.kml'))
        root = ET.fromstring(z.read(name))
    return {f.get('id') or f.findtext(K + 'name'): f for f in root.iter(K + 'Folder')}


def point(p):
    lon, lat = p.find('.//' + K + 'coordinates').text.strip().split(',')[:2]
    return round(float(lat), 6), round(float(lon), 6)


def plain(folder):
    rows = []
    for p in folder.findall(K + 'Placemark'):
        lat, lon = point(p)
        rows.append([p.findtext(K + 'name') or '', lat, lon])
    return {'fields': [], 'rows': rows}


def with_sheet(folder):
    """Placemarks whose description holds a Campo/Valor table."""
    recs = []
    for p in folder.findall(K + 'Placemark'):
        vals = dict(ROW.findall(p.findtext(K + 'description') or ''))
        code = (p.findtext(K + 'name') or vals.get('Código') or vals.get('Alias') or '').strip()
        if not code:
            continue
        lat, lon = point(p)
        recs.append((code, lat, lon, vals))
    order = []
    for *_, vals in recs:
        for k in vals:
            if k not in order:
                order.append(k)
    # Drop columns that repeat the code (it is the title) and columns that are empty everywhere
    fields = [f for f in order
              if f != 'Código'
              and any(v.get(f, '').strip() for *_, v in recs)
              and not all(v.get(f, '').strip() == c for c, *_, v in recs)]
    # Columns with few distinct values are stored as a list + index to keep data.json small
    enums = {}
    for f in fields:
        vals = sorted({v.get(f, '').strip() for *_, v in recs})
        if len(vals) <= 400 and len(recs) > 2000:
            enums[f] = vals
    idx = {f: {s: i for i, s in enumerate(vals)} for f, vals in enums.items()}
    rows = [[c, la, lo] + [idx[f][v.get(f, '').strip()] if f in idx else v.get(f, '').strip() for f in fields]
            for c, la, lo, v in recs]
    out = {'fields': fields, 'rows': rows}
    if enums:
        out['enums'] = enums
    return out


LAYERS = {
    'endesa': ('Nombres CCTT ENDESA', plain),
    'ext': ('CCTT EXTERNOS', with_sheet),
    'ddmm': ('DDMM_sub', with_sheet),
    'apoyo': ('Apoyo MT ENDESA', with_sheet),
}


def main(out, kmzs):
    groups = {}
    if os.path.exists(out):
        try:
            groups = json.load(open(out, encoding='utf-8')).get('groups', {})
        except (ValueError, AttributeError):
            groups = {}
    for kmz in kmzs:
        fl = folders_of(kmz)
        for gid, (folder, fn) in LAYERS.items():
            if folder in fl:
                groups[gid] = fn(fl[folder])
                print(f'{os.path.basename(kmz)}: {len(groups[gid]["rows"])} elementos en la capa «{gid}»')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'groups': groups}, f, ensure_ascii=False, separators=(',', ':'))
    print('Escrito', out)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2:])
