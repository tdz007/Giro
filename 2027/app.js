'use strict';
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateText = s => new Date(s.date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'short', year:'numeric', timeZone:'UTC' });
const meta = s => `${dateText(s)} · ${s.distanceKm} km · ${s.countries.join(' / ')}`;
let stages = [], selected = null, map, group, viewerStage, previousFocus;
const hidden = new Set(), routes = new Map(), layers = new Map();

function assetUrl(value) {
  if (!value) return null;
  const url = new URL(value, location.href);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.origin === location.origin)) throw new Error('Unsupported asset URL');
  return url.href;
}
function profileHtml(s) {
  if (s.profileLocal || s.profileUrl) return `<img class="profile-thumb" src="${escapeHtml(assetUrl(s.profileLocal || s.profileUrl))}" alt="Official altitude profile for stage ${s.stage}">`;
  const route = routes.get(s.stage);
  return route?.samples ? GiroRoute.profileSvg(route) || '<p>Altitude profile unavailable.</p>' : '<p>Altitude profile unavailable.</p>';
}
function tooltipHtml(s, kind) {
  const precision = routes.get(s.stage)?.coords ? 'Verified GPX' : s.coordinatePrecision;
  return `<strong>Stage ${s.stage}${kind ? ' · ' + kind : ''}</strong><br>${escapeHtml(dateText(s))}<br>Start: ${escapeHtml(s.start)}<br>Finish: ${escapeHtml(s.finish)}<br>${s.distanceKm} km<br><small>${escapeHtml(precision)}</small>${profileHtml(s)}`;
}
function filteredStages() {
  const query = $('searchBox').value.trim().toLowerCase(), country = $('countryFilter').value;
  return stages.filter(s => (!query || `${s.stage} ${s.start} ${s.finish} ${s.date} ${dateText(s)}`.toLowerCase().includes(query)) && (country === 'all' || s.countries.includes(country)));
}
function visibleStages() { return filteredStages().filter(s => !hidden.has(s.stage)); }
function stagePoints(s) { return routes.get(s.stage)?.coords || [s.startCoords, s.finishCoords]; }
function fit(items) {
  const points = items.flatMap(stagePoints);
  if (map && points.length) map.fitBounds(L.latLngBounds(points).pad(.12), { padding:[30,30], maxZoom:11 });
}
function selectStage(s) {
  selected = s.stage;
  hidden.delete(s.stage);
  render();
  fit([s]);
}
function renderMap() {
  if (!map) return;
  group.clearLayers(); layers.clear();
  for (const s of visibleStages()) {
    const route = routes.get(s.stage), points = stagePoints(s), active = selected === s.stage;
    const stageLayers = [];
    if (route?.segments) {
      const line = L.polyline(route.segments, {color:active ? '#b0004f' : '#d81b60', weight:active ? 6 : 4, opacity:.8})
        .bindTooltip(tooltipHtml(s, 'Route'), {sticky:true, direction:'top'}).addTo(group);
      line.on('click', () => { selectStage(s); openViewer(s, s.pdfUrl ? 'pdf' : s.mapUrl ? 'map' : 'profile'); });
      stageLayers.push(line);
    }
    const start = points[0], finish = points[points.length - 1];
    const same = start[0] === finish[0] && start[1] === finish[1];
    // Concentric markers keep both start and finish accessible for loop stages.
    for (const [kind, coord, color, radius] of [['Start', start, '#15803d', same ? 11 : 6], ['Finish', finish, '#b91c1c', 6]]) {
      const marker = L.circleMarker(coord, { radius:radius + (active ? 2 : 0), color, weight:2, fillColor:kind === 'Start' ? '#22c55e' : '#ef4444', fillOpacity:.8 })
        .bindTooltip(tooltipHtml(s, kind), {direction:'top', offset:[0,-6]}).addTo(group);
      marker.on('click', () => { selectStage(s); openViewer(s); });
      stageLayers.push(marker);
    }
    layers.set(s.stage, stageLayers);
  }
}
function render() {
  const items = filteredStages(), list = $('stageList');
  list.replaceChildren();
  if (!items.length) list.textContent = 'No matching stages. Try another city, date or country.';
  for (const s of items) {
    const item = document.createElement('article');
    item.className = 'stage-item' + (selected === s.stage ? ' active' : '');
    const route = routes.get(s.stage);
    const state = route?.coords ? 'Verified GPX loaded' : route?.error ? 'GPX could not be loaded; route not drawn' : s.gpxUrl ? 'Loading verified GPX…' : 'GPX not available';
    item.innerHTML = `<div class="stage-top"><span class="stage-number">Stage ${s.stage}</span><span class="stage-date">${escapeHtml(dateText(s))}</span></div>
      <button class="stage-select stage-route" aria-label="Locate stage ${s.stage}">${escapeHtml(s.start)} → ${escapeHtml(s.finish)}</button>
      <div class="stage-meta">${s.distanceKm} km · ${escapeHtml(s.countries.join(' / '))}<br>${state} · ${s.pdfUrl ? 'PDF available' : 'PDF not available'}</div>
      <div class="stage-actions"><label><input type="checkbox" ${hidden.has(s.stage) ? '' : 'checked'} aria-label="Show stage ${s.stage}">Show</label><button class="profile-button">View profile</button><button class="pdf-button" ${s.pdfUrl ? '' : 'disabled'}>Stage PDF</button></div>`;
    item.querySelector('.stage-select').onclick = () => selectStage(s);
    item.querySelector('input').onchange = event => {
      if (event.target.checked) hidden.delete(s.stage); else hidden.add(s.stage);
      renderMap(); updateStatus();
    };
    item.querySelector('.profile-button').onclick = () => openViewer(s);
    item.querySelector('.pdf-button').onclick = () => openViewer(s, 'pdf');
    list.append(item);
  }
  renderMap(); updateStatus();
}
function updateStatus() {
  const count = stages.filter(s => routes.get(s.stage)?.coords).length;
  $('status').textContent = `Verified 4 Nov 2026 · ${visibleStages().length}/${stages.length} stages visible · ${count} GPX routes loaded. Official profiles available for all 21 stages. Missing tracks are never estimated.`;
}
function openViewer(s, type = 'profile') {
  viewerStage = s;
  if (!$('stageOverlay').classList.contains('open')) previousFocus = document.activeElement;
  $('overlayTitle').textContent = `Stage ${s.stage}: ${s.start} → ${s.finish}`;
  $('overlayMeta').textContent = meta(s);
  const values = {profile:s.profileLocal || s.profileUrl, map:s.mapUrl, pdf:s.pdfUrl};
  document.querySelectorAll('[data-asset]').forEach(button => {
    button.disabled = !values[button.dataset.asset];
    button.setAttribute('aria-pressed', String(button.dataset.asset === type));
  });
  const img = $('overlayImage'), pdf = $('overlayPdf'), message = $('viewerMessage'), link = $('overlayLink');
  img.hidden = pdf.hidden = true; img.removeAttribute('src'); pdf.removeAttribute('src');
  message.textContent = ''; message.hidden = true;
  const url = assetUrl(values[type]);
  link.hidden = !url;
  if (url) link.href = url; else link.removeAttribute('href');
  if (!url) { message.textContent = `Official ${type === 'pdf' ? 'stage PDF' : type} not available. No substitute has been generated.`; message.hidden = false; }
  else if (type === 'pdf') {
    pdf.hidden = false; pdf.src = url + (url.includes('#') ? '' : '#view=FitH');
  } else {
    img.alt = `Official 2027 stage ${s.stage} ${type === 'profile' ? 'altitude profile' : 'map'}`;
    img.onerror = () => { img.hidden = true; message.hidden = false; message.textContent = 'This image could not be loaded. Use the original asset link above.'; };
    img.hidden = false; img.src = url;
  }
  $('stageOverlay').classList.add('open'); $('stageOverlay').setAttribute('aria-hidden','false');
  $('app').inert = true; document.body.style.overflow = 'hidden'; $('overlayClose').focus();
}
function closeViewer() {
  $('stageOverlay').classList.remove('open'); $('stageOverlay').setAttribute('aria-hidden','true');
  $('overlayPdf').removeAttribute('src'); $('app').inert = false; document.body.style.overflow = '';
  if (previousFocus?.isConnected) previousFocus.focus(); else $('searchBox').focus();
}
async function loadRoute(s) {
  if (!s.gpxUrl) return;
  try {
    const response = await fetch(assetUrl(s.gpxUrl), {signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    routes.set(s.stage, GiroRoute.parseGpxText(await response.text()));
  } catch (error) { routes.set(s.stage, {error:String(error)}); }
  // Always redraw current filters, never a stale snapshot captured before a fetch.
  render();
}
async function init() {
  try {
    const response = await fetch('./stages.json');
    if (!response.ok) throw new Error(`Stage data HTTP ${response.status}`);
    const data = await response.json(); stages = data.stages;
    if (data.edition !== 2027 || !Array.isArray(stages) || stages.length !== 21) throw new Error('Invalid 2027 stage data');
    if (typeof L !== 'undefined') {
      map = L.map('map', {zoomControl:true, preferCanvas:true}).setView([44.4,11],6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:18, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
      group = L.layerGroup().addTo(map);
    } else $('map').textContent = 'The map library could not load. Stage details and profiles remain available below. Check your connection and reload.';
    render(); fit(visibleStages());
    await Promise.all(stages.map(loadRoute));
  } catch (error) { $('status').textContent = `Unable to load the map: ${error.message}. Please reload using the hosted site or a local web server.`; }
}
$('searchBox').addEventListener('input', () => { render(); fit(visibleStages()); });
$('countryFilter').addEventListener('change', () => { render(); fit(visibleStages()); });
$('showAllBtn').onclick = () => { hidden.clear(); $('searchBox').value = ''; $('countryFilter').value = 'all'; selected = null; render(); fit(visibleStages()); };
$('hideAllBtn').onclick = () => { stages.forEach(s => hidden.add(s.stage)); render(); };
$('fitAllBtn').onclick = () => { selected = null; render(); fit(visibleStages()); };
$('overlayClose').onclick = closeViewer;
document.querySelectorAll('[data-asset]').forEach(button => button.onclick = () => openViewer(viewerStage, button.dataset.asset));
$('stageOverlay').onclick = event => { if (event.target === $('stageOverlay')) closeViewer(); };
document.addEventListener('keydown', event => {
  if (!$('stageOverlay').classList.contains('open')) return;
  if (event.key === 'Escape') closeViewer();
  if (event.key === 'Tab') {
    const focusable = [...$('stageOverlay').querySelectorAll('button:not(:disabled), a[href], iframe')].filter(el => !el.hidden);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
init();
