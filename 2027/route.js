/* GPX geometry is never inferred from host coordinates. Track segments stay separate. */
(function (root) {
  function distance(a, b) {
    const rad = Math.PI / 180;
    const x = Math.sin((b[0] - a[0]) * rad / 2) ** 2 +
      Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin((b[1] - a[1]) * rad / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  function parseGpxText(text) {
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.querySelector('parsererror') || xml.documentElement.localName !== 'gpx') throw new Error('Invalid GPX XML');
    const all = (parent, tag) => Array.from(parent.getElementsByTagNameNS('*', tag));
    let containers = all(xml, 'trkseg');
    let pointTag = 'trkpt';
    if (!containers.length) { containers = all(xml, 'rte'); pointTag = 'rtept'; }
    const segments = containers.map(segment => all(segment, pointTag).map(node => {
      const lat = Number(node.getAttribute('lat')), lon = Number(node.getAttribute('lon'));
      if (!node.hasAttribute('lat') || !node.hasAttribute('lon') || !node.getAttribute('lat').trim() || !node.getAttribute('lon').trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('Invalid GPX coordinate');
      const value = all(node, 'ele')[0]?.textContent.trim();
      return { coord: [lat, lon], elevation: value && Number.isFinite(Number(value)) ? Number(value) : null };
    })).filter(points => points.length > 1);
    if (!segments.length) throw new Error('GPX has no usable track or route');
    let km = 0;
    const samples = [];
    for (const segment of segments) {
      samples.push(null);
      segment.forEach((p, i) => {
        if (i) km += distance(segment[i - 1].coord, p.coord);
        samples.push(p.elevation === null ? null : { km, elevation: p.elevation });
      });
    }
    return { segments: segments.map(s => s.map(p => p.coord)), coords: segments.flatMap(s => s.map(p => p.coord)), samples, distanceKm: km };
  }
  function profileSvg(route) {
    const valid = route.samples.filter(Boolean);
    if (valid.length < 2 || route.distanceKm <= 0) return '';
    let min = Infinity, max = -Infinity;
    valid.forEach(p => { min = Math.min(min, p.elevation); max = Math.max(max, p.elevation); });
    const range = Math.max(1, max - min);
    let path = '', penDown = false;
    for (const p of route.samples) {
      if (!p) { penDown = false; continue; }
      const x = 8 + p.km / route.distanceKm * 264, y = 18 + (max - p.elevation) / range * 60;
      path += `${penDown ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `;
      penDown = true;
    }
    return `<div>GPX altitude profile (distance in km)</div><svg role="img" aria-label="GPX altitude profile" viewBox="0 0 280 100" width="280"><path d="${path}" fill="none" stroke="#d81b60" stroke-width="2"/><text x="8" y="12" font-size="10">${Math.round(max)} m</text><text x="8" y="96" font-size="10">0 km · ${Math.round(min)} m min</text><text x="220" y="96" font-size="10">${route.distanceKm.toFixed(1)} km</text></svg>`;
  }
  root.GiroRoute = { parseGpxText, profileSvg, distance };
})(globalThis);
