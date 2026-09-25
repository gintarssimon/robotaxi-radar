import { COLORS, STATUS, drivingLabel, isOperating } from './model.js?v=20260924-v6';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Group only nearby city centres on screen. Counts are cities, never vehicles.
export function clusterCities(groups, cities, project, zoom) {
  const clusters = [];
  for (const [key, records] of groups) {
    const city = cities[key];
    const point = project([city.lat, city.lng]);
    const nearby = zoom < 9 && clusters.find(c => Math.hypot(c.point.x - point.x, c.point.y - point.y) < 46);
    const item = { key, city, records };
    if (nearby) nearby.items.push(item);
    else clusters.push({ point, items: [item] });
  }
  return clusters;
}

export function createRadarMap({ cities, labelForDate }) {
  const container = document.getElementById('map');
  if (!window.L) {
    container.innerHTML = '<p class="map-empty">Die Karte konnte nicht geladen werden. Alle Standorte findest du in der Liste.</p>';
    return null;
  }
  const L = window.L;
  const map = L.map(container, {
    scrollWheelZoom: false, minZoom: 0, maxZoom: 19, zoomControl: false,
    worldCopyJump: false, maxBounds: [[-80, -180], [85, 180]], maxBoundsViscosity: .8
  }).setView([30, 0], 2);
  L.control.zoom({ position: 'bottomright', zoomInTitle: 'Karte vergrößern', zoomOutTitle: 'Karte verkleinern' }).addTo(map);
  L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 100 }).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
  const pins = L.featureGroup().addTo(map);
  const tiles = L.tileLayer(TILE_URL, {
    minZoom: 0, maxZoom: 19, noWrap: true, keepBuffer: 1,
    className: 'street-tiles',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap-Mitwirkende</a>'
  });
  const message = document.getElementById('map-message');
  let tileErrors = false;
  tiles.on('loading', () => { tileErrors = false; });
  tiles.on('tileerror', () => {
    tileErrors = true;
    message.querySelector('span').textContent = 'Einige Kartendetails sind nicht erreichbar. Standorte und Liste bleiben verfügbar.';
    message.hidden = false;
  });
  tiles.on('load', () => { if (!tileErrors) message.hidden = true; });
  document.getElementById('retry-map').onclick = () => { message.hidden = true; tiles.redraw(); };
  // A local, lower-detail map remains beneath the online street map on network failure.
  map.createPane('fallback');
  map.getPane('fallback').style.zIndex = 190;
  fetch('data/world.json', { signal: AbortSignal.timeout(8000) })
    .then(response => { if (!response.ok) throw new Error('world'); return response.json(); })
    .then(geo => {
      L.geoJSON(geo, { pane: 'fallback', style: { color: '#bacdca', weight: .7, fillColor: '#f3f3ed', fillOpacity: 1 }, interactive: false }).addTo(map);
      map.attributionControl.addAttribution('Umrisse: Natural Earth');
    }).catch(() => {});
  tiles.addTo(map);
  let groups = new Map();
  let markers = new Map();
  function draw() {
    pins.clearLayers();
    markers = new Map();
    const clusters = clusterCities(groups, cities, latlng => map.project(latlng), map.getZoom());
    for (const { items } of clusters) {
      if (items.length > 1) {
        const bounds = L.latLngBounds(items.map(item => [item.city.lat, item.city.lng]));
        const icon = L.divIcon({ className: 'city-cluster', iconSize: [42, 42], iconAnchor: [21, 21], html: `<span>${items.length}</span>` });
        const names = items.map(item => item.city.name).join(', ');
        const marker = L.marker(bounds.getCenter(), { icon, title: `${items.length} Städte: ${names}. Zum Vergrößern auswählen.`, keyboard: true }).addTo(pins);
        marker.bindTooltip(`${items.length} Städte · zum Vergrößern auswählen`, { direction: 'top' });
        marker.on('click', () => map.fitBounds(bounds, { padding: [65, 65], maxZoom: Math.min(map.getZoom() + 3, 12), animate: false }));
        continue;
      }
      const { key, city, records } = items[0];
      const providers = [...new Set(records.map(record => record.provider))];
      const colors = providers.map(provider => COLORS[provider]);
      const ring = colors.length === 1 ? colors[0] : `conic-gradient(${colors.map((color, i) => `${color} ${i * 100 / colors.length}% ${(i + 1) * 100 / colors.length}%`).join(',')})`;
      const state = records.some(isOperating) ? 'operating' : records.some(r => r.status === 'testing') ? 'testing' : records.some(r => ['announced', 'preparation'].includes(r.status)) ? 'future' : 'paused';
      const title = `${city.name}: ${providers.join(', ')}`;
      const icon = L.divIcon({ className: 'city-pin', iconSize: [34, 34], iconAnchor: [17, 17], html: `<span class="pin-ring" style="--ring:${ring};--pin:${colors[0]}"><span class="pin-core ${state}">${providers.length > 1 ? providers.length : providers[0][0]}</span></span>` });
      const marker = L.marker([city.lat, city.lng], { icon, title, keyboard: true }).addTo(pins);
      marker.bindTooltip(escape(city.name), { direction: 'top', offset: [0, -14], permanent: map.getZoom() >= 7, className: 'city-label' });
      const panel = document.createElement('div');
      panel.innerHTML = `<p class="popup-country">${escape(city.country)}</p><h3>${escape(city.name)}</h3>` + records.map(r => `<div class="popup-entry"><button data-detail="${escape(r.id)}"><span class="provider-name" data-provider="${escape(r.provider)}">${escape(r.provider)}</span> · ${escape(r.operator)} ↗</button><span class="badge ${escape(r.status)}">${STATUS[r.status]}</span><small>${escape(drivingLabel(r))}</small><small class="popup-date">${escape(labelForDate(r))}</small></div>`).join('') + `<button class="popup-zoom" data-city-focus="${escape(key)}">Stadt vergrößern ↗</button>`;
      marker.bindPopup(panel, { maxWidth: 310, maxHeight: 350, autoPanPadding: [24, 24] });
      markers.set(key, marker);
    }
  }
  map.on('zoomend', draw);
  // Expanded panels and responsive layout changes must update Leaflet's geometry.
  const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
  observer.observe(container);
  return {
    setRecords(records) {
      groups = new Map();
      for (const record of records) {
        if (!groups.has(record.cityKey)) groups.set(record.cityKey, []);
        groups.get(record.cityKey).push(record);
      }
      draw();
    },
    fit() {
      if (!groups.size) { map.closePopup(); return; }
      const bounds = L.latLngBounds([...groups.keys()].map(key => [cities[key].lat, cities[key].lng]));
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: groups.size === 1 ? 11 : 8, animate: false });
    },
    focusCity(key) {
      const city = cities[key];
      if (!city || !groups.has(key)) return;
      map.setView([city.lat, city.lng], 12, { animate: false });
      markers.get(key)?.openPopup();
    },
    resize() { map.invalidateSize({ pan: false }); }
  };
}
