"""Run from any directory: python3 2027/tests/validate.py."""
from pathlib import Path
import datetime, hashlib, json, subprocess, xml.etree.ElementTree as ET
root = Path(__file__).resolve().parents[1]
repo = root.parent
data = json.loads((root / 'stages.json').read_text())
stages = data['stages']
assert data['edition'] == 2027
assert [s['stage'] for s in stages] == list(range(1,22))
assert round(sum(s['distanceKm'] for s in stages),1) == 3418.9
expected = [datetime.date(2027,5,d).isoformat() for d in range(8,31) if d not in (17,24)]
assert [s['date'] for s in stages] == expected
for s in stages:
    assert s['sourceUrl'] == 'https://www.giroditalia.it/il-percorso/'
    assert s['start'] and s['finish'] and s['distanceKm'] > 0
    for key in ('startCoords','finishCoords'):
        lat,lon = s[key]
        assert -90 <= lat <= 90 and -180 <= lon <= 180
    for key in ('gpxUrl','pdfUrl','mapUrl'):
        if s[key]: assert s.get(key + 'Source'), f'Record provenance for {key}'
manifest = json.loads((root/'assets-manifest.json').read_text())
assert len(manifest['assets']) == 21
for asset in manifest['assets']:
    b = (root/asset['file']).read_bytes()
    assert b.startswith(b'\xff\xd8\xff') and b.endswith(b'\xff\xd9')
    assert len(b) == asset['bytes']
    assert hashlib.sha256(b).hexdigest() == asset['sha256']
    assert asset['url'] == stages[asset['stage']-1]['profileUrl']
base='dfb4da249b50e9bb44316d8b3384da36af667dd0'
for name in ['giro_2026_map.html'] + [f'Giro26-{n}-route.gpx' for n in range(1,22)]:
    original = subprocess.check_output(['git','show',f'{base}:{name}'],cwd=repo)
    assert (repo/name).read_bytes() == original, f'2026 file changed: {name}'
    if name.endswith('.gpx'):
        points = ET.fromstring(original).findall('.//{*}trkpt')
        assert len(points)>2
print('PASS: 21 official stages, dates/rest days, 3418.9 km, 21 asset hashes, coordinate ranges, provenance fields, and all 22 original files unchanged.')
