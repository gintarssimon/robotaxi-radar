export const STATUS = { live: 'Fahrgastbetrieb', limited: 'Eingeschränkter Start', testing: 'Test / Pilot', announced: 'Angekündigt', preparation:'Vorhaben / Vorbereitung', paused: 'Pausiert' };
export const DRIVING = { driverless: 'Fahrerlos belegt', supervised: 'Mit Begleitpersonal', unknown: 'Fahrerlosigkeit ungeklärt' };
export const COLORS = { Waymo: '#168c70', Uber: '#1d405d', Lyft: '#ae43a6', Tesla: '#da6650' };
export const day = value => value ? String(value).slice(0, 10) : null;
export function dateLabel(value) { return value ? new Date(day(value) + 'T12:00:00Z').toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}) : 'Nicht belegt'; }
export function isStale(record, now = new Date()) {
  const anchor = record.source.dynamic ? record.source.checkedAt : (record.source.publishedOn || record.source.checkedAt);
  return !anchor || (now - new Date(day(anchor) + 'T00:00:00Z')) / 86400000 > (record.source.dynamic ? 14 : 90);
}
export const isOperating = record => ['live','limited'].includes(record.status);
export function isDrivingStale(record, now = new Date()) {
  return record.driving !== 'unknown' && isStale({source:record.drivingSource || record.source}, now);
}
export function drivingLabel(record, now = new Date()) {
  if(!isOperating(record) && record.driving==='unknown')return record.status==='announced'?'Betriebsform noch offen':'Keine Angabe zur Fahrerlosigkeit';
  return DRIVING[record.driving]+(isDrivingStale(record,now)?' · älterer Beleg':'');
}
export const hasPlannedService = record => ['announced','testing'].includes(record.status);
export function isOverdue(record, now = new Date()) { return hasPlannedService(record) && record.target?.end && record.target.end < day(now.toISOString()); }
export function filterRecords(records, filters, cities) {
  const search = filters.search.trim().toLocaleLowerCase('de');
  return records.filter(r => filters.providers.includes(r.provider) && (filters.region === 'all' || cities[r.cityKey]?.region === filters.region) && (filters.status === 'all' || (filters.status==='operating'?isOperating(r):r.status === filters.status)) && (!search || `${cities[r.cityKey]?.name} ${r.cityKey.replace(/-/g,' ')} ${cities[r.cityKey]?.country} ${(cities[r.cityKey]?.aliases||[]).join(' ')} ${r.provider} ${r.operator}`.toLocaleLowerCase('de').includes(search)));
}
export function rankRecords(records, now = new Date()) {
  return Object.keys(COLORS).map(provider => {
    const own=records.filter(r=>r.provider===provider&&isOperating(r)),groups=new Map();
    for(const record of own){if(!groups.has(record.cityKey))groups.set(record.cityKey,[]);groups.get(record.cityKey).push(record);}
    const cities=[...groups].map(([cityKey,rows])=>({cityKey,id:rows[0].id,
      limited:rows.every(r=>r.status==='limited'),
      stale:rows.every(r=>isStale(r,now)),
      driverless:rows.some(r=>r.driving==='driverless'&&!isStale(r,now)&&!isDrivingStale(r,now)),
      supervised:rows.some(r=>r.driving==='supervised'&&!isStale(r,now)&&!isDrivingStale(r,now))
    }));
    return {provider,count:cities.length,cities,
      limited:cities.filter(c=>c.limited).length,
      stale:cities.filter(c=>c.stale).length,
      driverless:cities.filter(c=>c.driverless).length,
      supervised:cities.filter(c=>c.supervised&&!c.driverless).length,
      uncertain:cities.filter(c=>!c.driverless&&!c.supervised).length
    };
  }).sort((a,b) => b.count - a.count || a.provider.localeCompare(b.provider));
}
export function safeURL(raw) { try { const url = new URL(raw); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; } }
