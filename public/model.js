export const STATUS = { live: 'Fahrgastbetrieb', limited: 'Eingeschränkter Start', testing: 'Test / Pilot', announced: 'Angekündigt', paused: 'Pausiert' };
export const DRIVING = { driverless: 'Fahrerlos belegt', supervised: 'Mit Begleitpersonal', unknown: 'Fahrerlosigkeit ungeklärt' };
export const COLORS = { Waymo: '#168c70', Uber: '#1d405d', Lyft: '#ae43a6', Tesla: '#da6650' };
export const day = value => value ? String(value).slice(0, 10) : null;
export function dateLabel(value) { return value ? new Date(day(value) + 'T12:00:00Z').toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'}) : 'Nicht belegt'; }
export function isStale(record, now = new Date()) {
  const anchor = record.source.dynamic ? record.source.checkedAt : (record.source.publishedOn || record.source.checkedAt);
  return !anchor || (now - new Date(day(anchor) + 'T00:00:00Z')) / 86400000 > (record.source.dynamic ? 14 : 90);
}
export function isOverdue(record, now = new Date()) { return record.status === 'announced' && record.target?.end && record.target.end < day(now.toISOString()); }
export function filterRecords(records, filters, cities) {
  const search = filters.search.trim().toLocaleLowerCase('de');
  return records.filter(r => filters.providers.includes(r.provider) && (filters.region === 'all' || cities[r.cityKey]?.region === filters.region) && (filters.status === 'all' || r.status === filters.status) && (!search || `${cities[r.cityKey]?.name} ${cities[r.cityKey]?.country}`.toLocaleLowerCase('de').includes(search)));
}
export function rankRecords(records, now = new Date()) {
  return Object.keys(COLORS).map(provider => {
    const own = records.filter(r => r.provider === provider && r.driving === 'driverless' && !isStale(r, now));
    const live = new Set(own.filter(r => r.status === 'live').map(r => r.cityKey));
    const limited = new Set(own.filter(r => r.status === 'limited' && !live.has(r.cityKey)).map(r => r.cityKey));
    const uncertain=new Set(records.filter(r=>r.provider===provider && ['live','limited'].includes(r.status) && r.driving==='unknown').map(r=>r.cityKey));
    return {provider, count: live.size, limited: limited.size, uncertain: uncertain.size};
  }).sort((a,b) => b.count - a.count || b.limited - a.limited || a.provider.localeCompare(b.provider));
}
export function safeURL(raw) { try { const url = new URL(raw); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; } }
