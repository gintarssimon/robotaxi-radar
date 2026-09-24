import { STATUS, DRIVING, COLORS, dateLabel, isStale, isOverdue, filterRecords, rankRecords, safeURL } from './model.js';
const $ = id => document.getElementById(id);
const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let snapshot, cities, map, pins, mode = 'sample';
const checkedProviders = () => [...document.querySelectorAll('.provider input:checked')].map(el => el.value);
const getFilters = () => ({ providers: checkedProviders(), region: $('region').value, status: $('status').value, search: $('search').value });
function labelForDate(r) { return r.status === 'announced' ? r.target?.label || 'Termin offen' : r.launchedOn ? dateLabel(r.launchedOn) : 'Startdatum offen'; }
function sourceAnchor(r) { const url = safeURL(r.source.url); return url ? `<a class="source-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(new URL(url).hostname.replace(/^www\./,''))} ↗</a>` : '<span>Quelle ungültig</span>'; }
function render() {
  if (!snapshot || !cities) return;
  const filters = getFilters();
  const records = filterRecords(snapshot.records, filters, cities);
  const sort = $('sort').value;
  records.sort((a,b) => sort === 'provider' ? a.provider.localeCompare(b.provider) || cities[a.cityKey].name.localeCompare(cities[b.cityKey].name) : sort === 'target' ? ((a.status === 'announced' ? a.target?.start : null) || '9999').localeCompare((b.status === 'announced' ? b.target?.start : null) || '9999') : sort === 'checked' ? b.source.checkedAt.localeCompare(a.source.checkedAt) : cities[a.cityKey].name.localeCompare(cities[b.cityKey].name, 'de') || a.provider.localeCompare(b.provider));
  $('metric-cities').textContent = new Set(records.map(r => r.cityKey)).size;
  $('metric-live').textContent = new Set(records.filter(r => ['live','limited'].includes(r.status)).map(r => r.cityKey)).size;
  $('metric-next').textContent = records.filter(r => r.status === 'announced').length;
  $('metric-sources').textContent = new Set(records.map(r => r.source.url)).size;
  $('map-count').textContent = `${new Set(records.map(r => r.cityKey)).size} Städte · ${filters.region === 'all' ? 'weltweit' : filters.region}`;
  $('result-count').textContent = `${records.length} Einträge · ${mode === 'sample' ? 'recherchierte Startauswahl' : 'erfasste Quellen'} · Details per Klick auf die Stadt`;
  $('rows').innerHTML = records.map(r => `<tr><td><button class="row-city" data-detail="${escape(r.id)}">${escape(cities[r.cityKey].name)}</button><span class="sub">${escape(cities[r.cityKey].country)} · ${escape(cities[r.cityKey].region)}</span></td><td><span class="provider-name" data-provider="${escape(r.provider)}">${escape(r.provider)}</span><span class="sub">${escape(r.operator)} · ${escape(r.platform)}</span></td><td><span class="badge ${escape(r.status)}">${STATUS[r.status]}</span><span class="sub">${DRIVING[r.driving]}</span></td><td><span class="date">${escape(labelForDate(r))}</span><span class="sub ${isOverdue(r) ? 'warning' : ''}">${isOverdue(r) ? 'Ziel verstrichen · Start unbestätigt' : r.status === 'announced' ? 'Anbieterplanung' : 'laut verlinkter Quelle'}</span></td><td>${sourceAnchor(r)}<span class="sub ${isStale(r) ? 'warning' : ''}">${isStale(r) ? 'Älterer Beleg · erneut prüfen' : r.review === 'automatic' ? 'Automatisch erfasst' : 'Quelleninhalt geprüft'}</span></td></tr>`).join('');
  $('empty').hidden = records.length > 0;
  const rankings = rankRecords(records).filter(r => filters.providers.includes(r.provider));
  const max = Math.max(1, ...rankings.map(r => r.count));
  $('ranking').innerHTML = rankings.length ? rankings.map(r => `<div class="rank" data-provider="${r.provider}"><div class="rank-line"><span class="rank-label"><i class="rank-dot"></i>${r.provider}</span><span class="rank-value">${r.count} <small>${r.limited ? `+ ${r.limited} begrenzt` : r.uncertain ? `${r.uncertain} ungeklärt` : 'Städte'}</small></span></div><div class="rank-bar" aria-hidden="true"><span style="width:${r.count/max*100}%"></span></div></div>`).join('') : '<p>Wähle einen Anbieter.</p>';
  const upcoming = records.filter(r => r.status === 'announced' && r.target?.end && !isOverdue(r)).sort((a,b) => a.target.start.localeCompare(b.target.start))[0];
  $('next-launch').innerHTML = upcoming ? `<strong>${escape(upcoming.target.label)} · ${escape(cities[upcoming.cityKey].name)}</strong><p>${escape(upcoming.provider)} · angekündigt${isStale(upcoming) ? ' · älterer Beleg' : ''}</p>` : '<p>Kein Zielzeitraum in dieser Auswahl.</p>';
  drawPins(records);
}
function drawPins(records) {
  if (!map) return;
  pins.clearLayers();
  const groups = new Map();
  for (const r of records) { if (!groups.has(r.cityKey)) groups.set(r.cityKey, []); groups.get(r.cityKey).push(r); }
  for (const [key, group] of groups) {
    const city = cities[key];
    const providers = [...new Set(group.map(r => r.provider))];
    const color = providers.length === 1 ? COLORS[providers[0]] : '#3d6374';
    const future = group.every(r => r.status === 'announced');
    const icon = L.divIcon({ className:'city-pin', html:`<span class="pin-core ${future?'future':''}" style="--pin:${color}">${providers.length > 1 ? providers.length : ''}</span>`, iconSize:[26,26], iconAnchor:[13,13] });
    const marker = L.marker([city.lat,city.lng], {icon, title: `${city.name}: ${providers.join(', ')}`, keyboard:true}).addTo(pins);
    const panel = document.createElement('div');
    panel.innerHTML = `<h3>${escape(city.name)}</h3>` + group.map(r => `<div class="popup-entry"><button data-detail="${escape(r.id)}">${escape(r.provider)} · ${escape(r.operator)}</button><small>${STATUS[r.status]} · ${escape(labelForDate(r))}</small></div>`).join('');
    marker.bindPopup(panel);
  }
}
function fitMap() { if (map && pins.getLayers().length) map.fitBounds(pins.getBounds(), {padding:[35,35],maxZoom:7}); }
function showDetail(id) {
  const r = snapshot.records.find(r => r.id === id); if (!r) return;
  const city = cities[r.cityKey];
  $('detail-content').innerHTML = `<h2>${escape(city.name)}</h2><p><span class="provider-name" data-provider="${escape(r.provider)}">${escape(r.provider)}</span> · ${escape(city.country)}</p><span class="badge ${escape(r.status)}">${STATUS[r.status]}</span><dl class="detail-grid"><div><dt>Fahrsystem / Technologiepartner</dt><dd>${escape(r.operator)}</dd></div><div><dt>Buchung / Plattform</dt><dd>${escape(r.platform)}</dd></div><div><dt>Fahrerlosigkeit</dt><dd>${DRIVING[r.driving]}</dd></div><div><dt>Bekannter tatsächlicher Start</dt><dd>${dateLabel(r.launchedOn)}</dd></div><div><dt>Angekündigter Zielzeitraum</dt><dd>${escape(r.target?.label || 'Termin offen')}</dd></div><div><dt>Ankündigungsdatum</dt><dd>${dateLabel(r.announcedOn)}</dd></div></dl><p>${escape(r.notes || 'Es liegen keine zusätzlichen Angaben vor.')}</p>${isOverdue(r)?'<p class="warning">Der angekündigte Zeitraum ist verstrichen. Ein tatsächlicher Start ist in diesem Eintrag noch nicht belegt.</p>':''}${isStale(r)?'<p class="warning">Dieser Beleg ist älter. Der Eintrag zählt ohne neuere Bestätigung nicht im Vergleich für aktuelle fahrerlose Präsenz.</p>':''}<div class="source-box"><a href="${escape(safeURL(r.source.url) || '#')}" target="_blank" rel="noopener noreferrer">${escape(r.source.title)} ↗</a><p>Veröffentlicht: ${dateLabel(r.source.publishedOn)}${r.source.dynamic?' · laufend gepflegte Verfügbarkeitsseite':''}</p><p>Quelleninhalt geprüft: ${dateLabel(r.source.checkedAt)}</p><p>${r.review === 'automatic' ? 'Automatisch aus dem Quelleninhalt extrahiert; nicht redaktionell freigegeben.' : 'Für den Startdatensatz anhand der verlinkten Quelle eingeordnet.'}</p></div>${r.additionalSources?.length ? '<p class="sub">Weitere Belege: '+r.additionalSources.map(s=>`<a href="${escape(safeURL(s.url)||'#')}" target="_blank" rel="noopener noreferrer">${escape(s.title)} (${dateLabel(s.publishedOn)}) ↗</a>`).join(' · ')+'</p>' : ''}${r.history?.length?'<h3 style="margin-top:22px">Bisherige Änderungen</h3><ul class="history">'+r.history.slice(-6).reverse().map(h=>`<li>${dateLabel(h.at)} · ${escape(STATUS[h.status] || h.status)} · ${escape(h.target?.label || 'Termin offen')}</li>`).join('')+'</ul>':''}`;
  $('detail').showModal();
}
async function load() {
  $('refresh').disabled = true;
  let warning = '';
  try {
    const response = await fetch('data/snapshot.json', {cache:'no-cache',signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error('api');
    const data = await response.json();
    if (!Array.isArray(data.records)) throw new Error('format');
    snapshot = data; mode = data.mode || 'connected';
  } catch {
    if (snapshot) { warning = 'Die Aktualisierung ist fehlgeschlagen. Die zuletzt geladene Ansicht bleibt erhalten.'; }
    else {
      const response = await fetch('data/seed.json'); if (!response.ok) throw new Error('Startdaten nicht verfügbar');
      snapshot = await response.json(); mode = 'sample';
      warning = 'Vorschau · Recherchierte Startauswahl vom 23.09.2026. Die automatische Aktualisierung ist hier noch nicht verbunden.';
    }
  }
  snapshot.records = snapshot.records.filter(r => cities[r.cityKey] && STATUS[r.status] && DRIVING[r.driving] && COLORS[r.provider] && r.source);
  if (mode === 'sample' && !warning) warning = 'Vorschau · Recherchierte Startauswahl vom 23.09.2026. Automatische Aktualisierung noch nicht verbunden.';
  $('notice').textContent = warning || (snapshot.lastRun?.status === 'partial' || snapshot.lastRun?.status === 'failed' ? 'Die letzte Quellenprüfung war unvollständig. Betroffene Einträge behalten ihren bisherigen Stand.' : snapshot.lastRun ? 'Quellenprüfung ausgeführt · Stadtlisten werden nach festen Regeln aktualisiert; neue Meldungen benötigen eine Prüfung.' : 'Die erste automatische Quellenprüfung steht noch aus; aktuell siehst du die Startauswahl.');
  $('notice').classList.toggle('error', Boolean(warning && mode !== 'sample') || ['partial','failed'].includes(snapshot.lastRun?.status));
  $('sync-label').textContent = snapshot.lastRun ? `Letzter Prüflauf: ${dateLabel(snapshot.lastRun.at)}` : 'Startauswahl · 23.09.2026';
  $('coverage').textContent = mode === 'sample' ? 'Startdatensatz · keine vollständige Markterfassung' : 'Ausgewählte offizielle Quellen · täglicher Prüflauf';
  render(); renderQueue(); $('refresh').disabled = false;
}
function reset() { document.querySelectorAll('.provider input').forEach(el => el.checked = true); $('region').value='all';$('status').value='all';$('search').value='';render();fitMap(); }
document.addEventListener('click', e => { const detail = e.target.closest('[data-detail]'); if (detail) showDetail(detail.dataset.detail); const close = e.target.closest('[data-close]'); if (close) $(close.dataset.close).close(); });
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.querySelectorAll('.filters input,.filters select,#sort').forEach(el => el.addEventListener('input', () => {render(); if (el.id==='region') fitMap();}));
$('method-button').onclick = () => $('method').showModal(); $('refresh').onclick = () => load().catch(showError); $('fit-map').onclick=fitMap;$('reset').onclick=reset;$('empty-reset').onclick=reset;
function showError(error) { $('notice').textContent = 'Die Daten konnten nicht geladen werden. Bitte versuche es erneut.';$('notice').classList.add('error');$('refresh').disabled=false;console.error(error.message); }
try {
  const response = await fetch('data/cities.json'); cities = await response.json();
  if (window.L) {
    map = L.map('map', {scrollWheelZoom:false, minZoom:1, maxZoom:9, worldCopyJump:false, maxBounds:[[-80,-190],[85,190]],maxBoundsViscosity:.6}).setView([32,-34],2);
    map.attributionControl.setPrefix('Leaflet'); map.attributionControl.addAttribution('Länder: Natural Earth');
    pins = L.featureGroup().addTo(map);
    try { const geo = await (await fetch('data/world.json')).json(); L.geoJSON(geo, {style:{color:'#bfcfd8',weight:.8,fillColor:'#f9fbfc',fillOpacity:1},interactive:false}).addTo(map); } catch { $('map').insertAdjacentHTML('beforeend','<p class="map-empty">Länderumrisse nicht verfügbar.</p>'); }
  } else { $('map').innerHTML='<p class="map-empty">Die Karte konnte nicht geladen werden. Alle Einträge sind in der Liste verfügbar.</p>'; }
  await load(); fitMap();
} catch(error) { showError(error); }

function renderQueue() {
  const items = snapshot.reviewQueue || [];
  $('review-panel').hidden = items.length === 0;
  $('review-queue').innerHTML = items.slice(0,50).map(item => `<div class="review-item"><strong>${escape(item.provider)}</strong><a href="${escape(safeURL(item.url)||'#')}" target="_blank" rel="noopener noreferrer">${escape(item.title)} ↗</a><span class="sub">${escape(item.reason)} · entdeckt ${dateLabel(item.detectedOn)}</span></div>`).join('');
}
