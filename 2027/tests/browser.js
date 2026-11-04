const results = document.getElementById('results');
const frame = document.getElementById('app');
const lines = [];
function check(ok, name) { if (!ok) throw new Error(name); lines.push('PASS ' + name); results.textContent = lines.join('\n'); }
async function until(fn) { for(let i=0;i<100;i++){ if(fn()) return; await new Promise(r=>setTimeout(r,100)); } throw Error('Timed out'); }
frame.onload = async () => {
 try {
  const w = frame.contentWindow, d = w.document, run = code => w.eval(code);
  await until(()=>d.querySelectorAll('.stage-item').length===21);
  check(d.querySelectorAll('.stage-item').length===21, 'All 21 stages load from a relative path');
  check(run('layers.size')===21 && run('routes.size')===0, 'Missing GPX draws markers only, with no route requests');
  check(run('Array.from(layers.values()).every(x=>x.length===2)'), 'No fabricated route polylines');
  d.querySelector('#hideAllBtn').click(); check(run('layers.size')===0,'Hide all removes every map layer');
  d.querySelector('#showAllBtn').click(); check(run('layers.size')===21,'Show all restores every stage');
  const checkbox=d.querySelector('[aria-label="Show stage 1"]'); checkbox.click();
  check(!run('layers.has(1)'),'Individual visibility removes both endpoints');
  d.querySelector('#countryFilter').value='Slovenia'; d.querySelector('#countryFilter').dispatchEvent(new w.Event('change'));
  check(d.querySelectorAll('.stage-item').length===2 && run('layers.size')===1,'Country filter preserves visibility choice');
  d.querySelector('#showAllBtn').click();
  d.querySelector('#searchBox').value='2027-05-14'; d.querySelector('#searchBox').dispatchEvent(new w.Event('input'));
  check(d.querySelectorAll('.stage-item').length===1 && d.querySelector('.stage-number').textContent==='Stage 7','ISO date search');
  d.querySelector('.profile-button').focus(); d.querySelector('.profile-button').click();
  await until(()=>d.querySelector('#overlayImage').naturalWidth>0);
  check(d.querySelector('#stageOverlay').classList.contains('open') && d.querySelector('#app').inert,'Profile viewer opens and traps background focus');
  check(d.querySelector('#overlayMeta').textContent.includes('Friday, 14 May 2027'),'Viewer date and weekday');
  check(d.querySelector('[data-asset="pdf"]').disabled,'Missing PDF is disabled');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));
  check(!d.querySelector('#stageOverlay').classList.contains('open') && d.activeElement.className==='profile-button','Escape closes viewer and restores focus');
  d.querySelector('#searchBox').value='no-such-host'; d.querySelector('#searchBox').dispatchEvent(new w.Event('input'));
  check(run('layers.size')===0 && d.querySelector('#stageList').textContent.includes('No matching'),'Empty search clears layers');
  d.querySelector('#showAllBtn').click();
  const parse=w.GiroRoute.parseGpxText;
  const xml='<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg><trkpt lat="45" lon="10"><ele>100</ele></trkpt><trkpt lat="45.01" lon="10.01"><ele>150</ele></trkpt></trkseg><trkseg><trkpt lat="46" lon="11"/><trkpt lat="46.01" lon="11.01"><ele>300</ele></trkpt></trkseg></trk></gpx>';
  const parsed=parse(xml);
  check(parsed.segments.length===2 && parsed.distanceKm<4,'Disconnected GPX segments never joined or counted as riding distance');
  check(parsed.samples.filter(Boolean).length===3,'Missing elevations remain gaps, never zero');
  check(!w.GiroRoute.profileSvg(parsed).includes('NaN'),'Distance-based elevation SVG is finite');
  for(const input of ['<html/>','<gpx><trk><trkseg><trkpt lat="91" lon="0"/><trkpt lat="45" lon="10"/></trkseg></trk></gpx>','<gpx><rte><rtept lat="" lon="0"/><rtept lat="45" lon="10"/></rte></gpx>']) {
    let rejected=false; try{parse(input)}catch{rejected=true} check(rejected,'Invalid GPX rejected');
  }
  check(parse('<gpx><rte><rtept lat="45" lon="10"/><rtept lat="45.01" lon="10.01"/></rte></gpx>').coords.length===2,'Route-point GPX supported without elevations');
  // Deliberately reuse existing 2026 geometry solely inside this test iframe.
  await run("loadRoute({...stages[0], gpxUrl:'../Giro26-1-route.gpx'})");
  check(run('routes.get(1).coords.length')>100 && run('layers.get(1).length')===3,'Real repository GPX loads, draws route and endpoints');
  run('layers.get(1)[0].fire("mouseover", {latlng:layers.get(1)[1].getLatLng()})');
  check(d.querySelector('.leaflet-tooltip').textContent.includes('Stage 1') && d.querySelector('.leaflet-tooltip img'),'Route hover includes stage metadata and official profile');
  run('layers.get(1)[0].fire("click")');
  check(d.querySelector('#stageOverlay').classList.contains('open'),'Route click opens viewer');
  d.querySelector('#overlayClose').click();
  run('layers.get(1)[1].fire("mouseover")');
  check(d.querySelector('.leaflet-tooltip').textContent.includes('Start'),'Start hover tooltip');
  run('layers.get(1)[1].closeTooltip(); layers.get(1)[2].fire("mouseover")');
  check(d.querySelector('.leaflet-tooltip').textContent.includes('Finish'),'Finish hover tooltip');
  await run("loadRoute({...stages[1],gpxUrl:'./assets/missing-test.gpx'})");
  check(run('routes.get(2).error') && run('layers.get(2).length')===2,'Failed GPX leaves markers, no fallback route');
  run("openViewer({...stages[0],pdfUrl:'./tests/sample.pdf'},'pdf')");
  check(!d.querySelector('#overlayPdf').hidden && d.querySelector('#overlayPdf').src.endsWith('sample.pdf#view=FitH'),'PDF viewer embeds PDF and exposes original link');
  check(d.querySelector('#overlayLink').href.endsWith('sample.pdf'),'PDF fallback link');
  d.querySelector('#overlayClose').click();
  check(!d.querySelector('#overlayPdf').hasAttribute('src'),'PDF unloaded on close');
  d.querySelector('#showAllBtn').click();
  results.textContent=lines.join('\n')+'\n\nALL '+lines.length+' CHECKS PASSED';
 } catch(e) { results.textContent=lines.join('\n')+'\nFAIL '+e.stack; }
};
