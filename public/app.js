import { STATUS, DRIVING, COLORS, dateLabel, isStale, isOverdue, filterRecords, rankRecords, safeURL, drivingLabel, isDrivingStale, isOperating, hasPlannedService } from './model.js?v=20260924-v6';
import {applyBaseline,RELEASE} from './baseline.js?v=20260924-v6';
import {createRadarMap} from './map-view.js?v=20260925-design7';
const DESIGN_RELEASE = '2026-09-25.7';
const $ = id => document.getElementById(id);
const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let snapshot, cities, map, baseline, mode = 'sample';
const checkedProviders = () => [...document.querySelectorAll('.provider input:checked')].map(el => el.value);
const getFilters = () => ({ providers: checkedProviders(), region: $('region').value, status: $('status').value, search: $('search').value });
function labelForDate(r) { return hasPlannedService(r) ? r.target?.label || 'Termin offen' : r.launchedOn ? dateLabel(r.launchedOn) : isOperating(r) && !r.source.dynamic && r.source.publishedOn ? 'Belegt am '+dateLabel(r.source.publishedOn) : 'Startdatum offen'; }
function sourceAnchor(r) { const url = safeURL(r.source.url); return url ? `<a class="source-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(new URL(url).hostname.replace(/^www\./,''))} ↗</a>` : '<span>Quelle ungültig</span>'; }
function render() {
  if (!snapshot || !cities) return;
  const filters = getFilters();
  const records = filterRecords(snapshot.records, filters, cities);
  const sort = $('sort').value;
  records.sort((a,b) => sort === 'provider' ? a.provider.localeCompare(b.provider) || cities[a.cityKey].name.localeCompare(cities[b.cityKey].name) : sort === 'target' ? ((hasPlannedService(a) ? a.target?.start : null) || '9999').localeCompare((hasPlannedService(b) ? b.target?.start : null) || '9999') : sort === 'checked' ? b.source.checkedAt.localeCompare(a.source.checkedAt) : cities[a.cityKey].name.localeCompare(cities[b.cityKey].name, 'de') || a.provider.localeCompare(b.provider));
  $('metric-cities').textContent = new Set(records.map(r => r.cityKey)).size;
  $('metric-live').textContent = new Set(records.filter(r => isOperating(r)).map(r => r.cityKey)).size;
  $('metric-next').textContent = records.filter(r => r.status === 'announced' || r.status==='testing'&&r.target).length;
  $('metric-sources').textContent = new Set(records.map(r => r.source.url)).size;
  document.querySelectorAll('[data-region]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.region === filters.region)));
  $('map-count').textContent = `${new Set(records.map(r => r.cityKey)).size} Städte · ${filters.region === 'all' ? 'weltweit' : filters.region}`;
  $('result-count').textContent = `${records.length} Einträge · ${mode === 'sample' ? 'recherchierte Startauswahl' : 'erfasste Quellen'} · Stadt wählen für Quellen & Details`;
  $('rows').innerHTML = records.map(r => `<tr><td data-label="Stadt / Region"><button class="row-city" data-detail="${escape(r.id)}">${escape(cities[r.cityKey].name)}</button><span class="sub">${escape(cities[r.cityKey].country)} · ${escape(cities[r.cityKey].region)}</span><button class="row-map" data-city-focus="${escape(r.cityKey)}" aria-label="${escape(cities[r.cityKey].name)} auf der Karte zeigen">Auf Karte ↗</button></td><td data-label="Anbieter & Partner"><span class="provider-name" data-provider="${escape(r.provider)}">${escape(r.provider)}</span><span class="sub">${escape(r.operator)} · ${escape(r.platform)}</span></td><td data-label="Status"><span class="badge ${escape(r.status)}">${STATUS[r.status]}</span><span class="sub">${escape(drivingLabel(r))}</span></td><td data-label="Start / Zieltermin"><span class="date">${escape(labelForDate(r))}</span><span class="sub ${isOverdue(r) ? 'warning' : ''}">${isOverdue(r) ? 'Ziel verstrichen · Start unbestätigt' : hasPlannedService(r) ? 'Geplanter öffentlicher Start' : 'laut verlinkter Quelle'}</span></td><td data-label="Quelle">${sourceAnchor(r)}<span class="sub ${isStale(r) ? 'warning' : ''}">${isStale(r) ? 'Letzter Beleg älter · erneut prüfen' : r.review === 'automatic' ? 'Automatisch erfasst' : 'Quelleninhalt geprüft'}</span></td></tr>`).join('');
  $('empty').hidden = records.length > 0;
  const rankings = rankRecords(records).filter(r => filters.providers.includes(r.provider));
  const max = Math.max(1, ...rankings.map(r => r.count));
  $('ranking').innerHTML = rankings.length ? rankings.map(r => {
    const breakdown=r.count?[`${r.driverless} fahrerlos belegt`,r.supervised?`${r.supervised} mit Begleitpersonal`:null,r.uncertain?`${r.uncertain} ohne aktuellen Fahrerlosigkeitsbeleg`:null,r.limited?`${r.limited} mit eingeschränktem Zugang`:null,r.stale?`${r.stale} mit älterem Betriebsbeleg`:null].filter(Boolean).join(' · '):'Kein Fahrgastbetrieb in dieser Auswahl erfasst';
    const locations=r.cities.slice().sort((a,b)=>cities[a.cityKey].name.localeCompare(cities[b.cityKey].name,'de')).map(c=>`<button data-detail="${escape(c.id)}">${escape(cities[c.cityKey].name)}${c.stale?' *':''}</button>`).join('');
    return `<div class="rank" data-provider="${r.provider}"><div class="rank-line"><span class="rank-label"><i class="rank-dot"></i>${r.provider}</span><span class="rank-value">${r.count} <small>${r.count===1?'Stadt':'Städte'}</small></span></div><div class="rank-bar" aria-hidden="true"><span style="width:${r.count/max*100}%"></span></div><p class="rank-detail">${breakdown}</p>${r.count?`<details class="rank-cities"><summary>Standorte anzeigen</summary><div>${locations}</div></details>`:''}</div>`;
  }).join('') : '<p>Wähle einen Anbieter.</p>';
  const upcoming = records.filter(r => hasPlannedService(r) && r.target?.end && !isOverdue(r)).sort((a,b) => a.target.start.localeCompare(b.target.start))[0];
  $('next-launch').innerHTML = upcoming ? `<strong>${escape(upcoming.target.label)} · ${escape(cities[upcoming.cityKey].name)}</strong><p>${escape(upcoming.provider)} · öffentlicher Start geplant${isStale(upcoming) ? ' · älterer Beleg' : ''}</p>` : '<p>Kein Zielzeitraum in dieser Auswahl.</p>';
  drawPins(records);
}
function drawPins(records) { map?.setRecords(records); }
function fitMap() { map?.fit(); }
function focusCity(key) {
  if (!map) return;
  $('detail').close();
  $('map-panel').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
  map.focusCity(key);
}
let expanded = false;
function expandMap(next) {
  expanded = next;
  $('map-panel').classList.toggle('expanded', expanded);
  document.body.classList.toggle('map-expanded', expanded);
  $('expand-map').setAttribute('aria-expanded', String(expanded));
  $('expand-map').textContent = expanded ? 'Karte verkleinern ×' : 'Karte vergrößern ⛶';
  document.querySelectorAll('main > :not(.workspace), .topbar, .workspace > .comparison').forEach(el => el.inert = expanded);
  map?.resize();
  $('expand-map').focus({preventScroll:true});
}
function showDetail(id) {
  const r = snapshot.records.find(r => r.id === id); if (!r) return;
  const city = cities[r.cityKey];
  $('detail-content').innerHTML = `<h2>${escape(city.name)}</h2><button class="outline-button" data-city-focus="${escape(r.cityKey)}">Auf der Karte ansehen ↗</button><p><span class="provider-name" data-provider="${escape(r.provider)}">${escape(r.provider)}</span> · ${escape(city.country)}</p><span class="badge ${escape(r.status)}">${STATUS[r.status]}</span><dl class="detail-grid"><div><dt>Fahrsystem / Technologiepartner</dt><dd>${escape(r.operator)}</dd></div><div><dt>Buchung / Plattform</dt><dd>${escape(r.platform)}</dd></div><div><dt>Fahrerlosigkeit</dt><dd>${escape(drivingLabel(r))}</dd></div><div><dt>Bekannter tatsächlicher Start</dt><dd>${dateLabel(r.launchedOn)}</dd></div><div><dt>Angekündigter Zielzeitraum</dt><dd>${escape(r.target?.label || 'Termin offen')}</dd></div><div><dt>Ankündigungsdatum</dt><dd>${dateLabel(r.announcedOn)}</dd></div></dl><p>${escape(r.notes || 'Es liegen keine zusätzlichen Angaben vor.')}</p>${isOverdue(r)?'<p class="warning">Der angekündigte Zeitraum ist verstrichen. Ein tatsächlicher Start ist in diesem Eintrag noch nicht belegt.</p>':''}${isStale(r)?'<p class="warning">Der Beleg ist älter. Der Eintrag zeigt den zuletzt belegten Stand; die heutige Situation ist damit nicht bestätigt.</p>':''}${r.drivingSource?`<p class="driving-source">Beleg zur Fahrerlosigkeit: <a href="${escape(safeURL(r.drivingSource.url)||'#')}" target="_blank" rel="noopener noreferrer">${escape(r.drivingSource.title)}</a> · ${dateLabel(r.drivingSource.dynamic?r.drivingSource.checkedAt:r.drivingSource.publishedOn)}${isDrivingStale(r)?' · erneut prüfen':''}</p>`:''}<div class="source-box"><a href="${escape(safeURL(r.source.url) || '#')}" target="_blank" rel="noopener noreferrer">${escape(r.source.title)} ↗</a><p>Veröffentlicht: ${dateLabel(r.source.publishedOn)}${r.source.dynamic?' · laufend gepflegte Verfügbarkeitsseite':''}</p><p>Quelleninhalt geprüft: ${dateLabel(r.source.checkedAt)}</p><p>${r.review === 'automatic' ? 'Automatisch aus dem Quelleninhalt extrahiert; nicht redaktionell freigegeben.' : 'Anhand der verlinkten offiziellen Quelle eingeordnet. Das Prüfdatum erneuert nicht das Ereignisdatum.'}</p></div>${r.additionalSources?.length ? '<p class="sub">Weitere Belege: '+r.additionalSources.map(s=>`<a href="${escape(safeURL(s.url)||'#')}" target="_blank" rel="noopener noreferrer">${escape(s.title)} (${dateLabel(s.publishedOn)}) ↗</a>`).join(' · ')+'</p>' : ''}${r.history?.length?'<h3 style="margin-top:22px">Bisherige Änderungen</h3><ul class="history">'+r.history.slice(-6).reverse().map(h=>`<li>${dateLabel(h.at)} · ${escape(STATUS[h.status] || h.status)} · ${escape(h.target?.label || 'Termin offen')}</li>`).join('')+'</ul>':''}`;
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
  try {
    const response=await fetch('data/verified.json?v=20260924-v6',{cache:'no-cache',signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('Grundbestand fehlt');
    const data=await response.json();
    if(data.version!==RELEASE||!Array.isArray(data.records))throw new Error('Update unvollständig');
    baseline=data;
  } catch {
    warning += (warning?' ':'')+'Die geprüften Ergänzungen konnten nicht geladen werden. Bitte die Dateien des Updates vollständig veröffentlichen.';
  }
  if(baseline)snapshot=applyBaseline(snapshot,baseline);
  snapshot.records = snapshot.records.filter(r => cities[r.cityKey] && STATUS[r.status] && DRIVING[r.driving] && COLORS[r.provider] && r.source);
  if (mode === 'sample' && !warning) warning = 'Vorschau · Recherchierte Startauswahl vom 23.09.2026. Automatische Aktualisierung noch nicht verbunden.';
  const affected=Object.entries(snapshot.lastRun?.providers||{}).filter(([,report])=>report.errors?.length).map(([provider,report])=>provider+(report.errors.some(e=>/403/.test(e.reason))?' (Abruf abgelehnt)':report.errors.some(e=>/429/.test(e.reason))?' (Anfragelimit)':''));
  $('notice').textContent = warning || (['partial','failed'].includes(snapshot.lastRun?.status) ? 'Quellenprüfung unvollständig'+(affected.length?': '+affected.join(', '):'')+'. Nicht bestätigte Einträge behalten ihren bisherigen Stand.' : snapshot.lastRun ? 'Quellenprüfung ausgeführt · Eindeutige offizielle Ankündigungen, Startmeldungen und Verfügbarkeitslisten werden automatisch übernommen; unklare Meldungen stehen zur Prüfung bereit.' : 'Die erste automatische Quellenprüfung steht noch aus; aktuell siehst du die Startauswahl.');
  $('notice').classList.toggle('error', Boolean(warning && mode !== 'sample') || ['partial','failed'].includes(snapshot.lastRun?.status));
  $('sync-label').textContent = snapshot.lastRun ? `Letzter Prüflauf: ${dateLabel(snapshot.lastRun.at)}` : 'Startauswahl · 23.09.2026';
  $('coverage').textContent = mode === 'sample' ? 'Startdatensatz · keine vollständige Markterfassung' : 'Design '+DESIGN_RELEASE+' · Daten '+RELEASE;
  render(); renderQueue(); renderCoverage(); $('refresh').disabled = false;
}
function reset() { document.querySelectorAll('.provider input').forEach(el => el.checked = true); $('region').value='all';$('status').value='all';$('search').value='';render();fitMap(); }
document.addEventListener('click', e => { const city = e.target.closest('[data-city-focus]'); if (city) focusCity(city.dataset.cityFocus); const region = e.target.closest('[data-region]'); if(region) { $('region').value = region.dataset.region; render(); fitMap(); } const detail = e.target.closest('[data-detail]'); if (detail) showDetail(detail.dataset.detail); const close = e.target.closest('[data-close]'); if (close) $(close.dataset.close).close(); });
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
let searchTimer;
document.querySelectorAll('.filters input,.filters select,#sort').forEach(el => el.addEventListener('input', () => {
  render();
  clearTimeout(searchTimer);
  if(el.id === 'search') searchTimer = setTimeout(fitMap, 250);
  else if(el.id !== 'sort') fitMap();
}));
$('expand-map').onclick = () => expandMap(!expanded);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && expanded && !document.querySelector('dialog[open]')) { event.preventDefault(); expandMap(false); }
  if (event.key === 'Tab' && expanded && !document.querySelector('dialog[open]')) {
    const focusable = [...$('map-panel').querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')].filter(el => el.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});
$('method-button').onclick = () => $('method').showModal(); $('refresh').onclick = () => load().catch(showError); $('fit-map').onclick=fitMap;$('reset').onclick=reset;$('empty-reset').onclick=reset;
function showError(error) { $('notice').textContent = 'Die Daten konnten nicht geladen werden. Bitte versuche es erneut.';$('notice').classList.add('error');$('refresh').disabled=false;console.error(error.message); }
try {
  const response = await fetch('data/cities.json?v=20260924-v6',{cache:'no-cache'}); cities = await response.json();
  map = createRadarMap({cities, labelForDate});
  await load(); fitMap();
} catch(error) { showError(error); }

function renderQueue() {
  const items = snapshot.reviewQueue || [];
  $('review-count').textContent=items.length+' Meldungen benötigen eine Zuordnung oder Prüfung.';
  $('review-panel').hidden = items.length === 0;
  $('review-queue').innerHTML = items.map(item => `<div class="review-item"><strong>${escape(item.provider)}</strong><a href="${escape(safeURL(item.url)||'#')}" target="_blank" rel="noopener noreferrer">${escape(item.title)} ↗</a><span class="sub">${escape(item.reason)}${item.places?.length?' · Ortsnamen prüfen: '+escape(item.places.join(', ')):''} · entdeckt ${dateLabel(item.detectedOn)}</span></div>`).join('');
}

function renderCoverage(){
  const reports=snapshot.lastRun?.providers||{};
  $('source-health').innerHTML=Object.keys(COLORS).map(provider=>{
    const report=reports[provider];
    const status=!report?'Noch kein Prüflauf':report.errors?.length?'Teilweise nicht erreichbar':'Abruf abgeschlossen';
    return `<div class="review-item"><strong>${provider}</strong><span>${status}</span><span class="sub">${report?.pages||0} Seiten gelesen · ${report?.backlog??'–'} entdeckte Seiten noch ungelesen</span>${report?.errors?.map(e=>`<span class="sub warning">${escape(e.url?new URL(e.url).hostname+': ':'')}${escape(e.reason)}</span>`).join('')||''}</div>`;
  }).join('');
  $('data-release').textContent='Design '+DESIGN_RELEASE+' · Datenlogik '+RELEASE+' · Grundbestand '+(baseline?.version||'nicht geladen')+' · letzter automatischer Lauf '+(snapshot.lastRun?.release||'vor diesem Update');
}
