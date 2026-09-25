import { OPERATORS, PLATFORMS } from './sources.mjs';
export function canonicalURL(raw, hosts) {
  const u = new URL(raw);
  if (u.protocol !== 'https:' || !hosts.includes(u.hostname) || u.username || u.password || (u.port && u.port !== '443')) throw new Error('Nicht erlaubte Quellenadresse');
  u.hash='';
  for (const key of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/.test(key)) u.searchParams.delete(key);
  return u.href;
}
export function validDay(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
export const normalize = value => String(value || '').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
function requiredText(value,max=500) { if (typeof value !== 'string' || !value.trim() || value.length>max) throw new Error('Text fehlt oder zu lang');return value.trim(); }
export function makeTarget(raw) {
  if (!raw) return null;
  const {start,end,precision} = raw;
  if (!validDay(start) || !validDay(end) || start>end || !['day','month','quarter','half','year','range'].includes(precision)) throw new Error('Ungültiger Zielzeitraum');
  const year=start.slice(0,4),month=Number(start.slice(5,7));
  let label;
  if(precision==='day'){if(start!==end)throw new Error('Ungültiger Tag');label=start.split('-').reverse().join('.');}
  if(precision==='year'){if(start!==`${year}-01-01`||end!==`${year}-12-31`)throw new Error('Ungültiges Jahr');label=year;}
  if(precision==='month'){
    const last=new Date(Date.UTC(Number(year),month,0)).toISOString().slice(0,10);
    if(!start.endsWith('-01')||end!==last)throw new Error('Ungültiger Monat');
    label=new Date(start+'T12:00:00Z').toLocaleDateString('de-DE',{month:'long',year:'numeric'});
  }
  if(precision==='quarter'){
    if(![1,4,7,10].includes(month)||!start.endsWith('-01')||end!==new Date(Date.UTC(Number(year),month+2,0)).toISOString().slice(0,10))throw new Error('Ungültiges Quartal');
    label=`Q${Math.ceil(month/3)} ${year}`;
  }
  if(precision==='half'){
    if(![1,7].includes(month)||!start.endsWith('-01')||end!==new Date(Date.UTC(Number(year),month+5,0)).toISOString().slice(0,10))throw new Error('Ungültiges Halbjahr');
    label=(month===1?'1':'2')+'. Halbjahr '+year;
  }
  if(precision==='range') label=`${start.split('-').reverse().join('.')} – ${end.split('-').reverse().join('.')}`;
  const qualifiers={early:'Anfang',mid:'Mitte',late:'Ende',spring:'Frühjahr',summer:'Sommer',autumn:'Herbst',winter:'Winter'};
  if(raw.qualifier){
    if(precision!=='year'||!qualifiers[raw.qualifier])throw new Error('Ungültige ungefähre Zeitangabe');
    // Year boundaries serve sorting and overdue checks, not precise launch dates.
    label=qualifiers[raw.qualifier]+' '+year;
  }
  return {start,end,precision,label,...(raw.qualifier?{qualifier:raw.qualifier}:{})};
}
export function normalizeCandidate(raw, provider, pages, cities, today) {
  if (!raw || typeof raw !== 'object' || !cities[raw.cityKey]) throw new Error('Ort fehlt im Ortskatalog');
  if (!OPERATORS.includes(raw.operator) || !PLATFORMS.includes(raw.platform)) throw new Error('Unbekannter Partner');
  if ((provider==='Waymo' || provider==='Tesla') && raw.operator!==provider) throw new Error('Falscher Technologieanbieter');
  if (provider==='Uber' && raw.platform!=='Uber' || provider==='Lyft' && raw.platform!=='Lyft') throw new Error('Falsche Buchungsplattform');
  if (!['live','limited','testing','announced','paused'].includes(raw.status) || !['driverless','supervised','unknown'].includes(raw.driving)) throw new Error('Ungültiger Status');
  const page = pages[raw.sourceIndex];
  if (!Number.isInteger(raw.sourceIndex) || !page) throw new Error('Quelle fehlt');
  const quote=requiredText(raw.evidence,350);
  if (quote.split(/\s+/).length>25 || quote.length<15 || !normalize(page.text).includes(normalize(quote))) throw new Error('Beleg nicht in Quelle gefunden');
  const cityNames=[cities[raw.cityKey].name,raw.cityKey.replace(/-/g,' '),...(cities[raw.cityKey].aliases||[])];
  if(!cityNames.some(name=>normalize(quote).includes(normalize(name))))throw new Error('Ortsbezug fehlt im Beleg');
  // A second quote must explicitly support the absence of onboard personnel.
  if (raw.driving==='driverless') {
    const q=requiredText(raw.drivingEvidence,350);
    if (q.split(/\s+/).length>25 || !normalize(page.text).includes(normalize(q)) || !/driverless|fully autonomous|no human|without.{0,30}(driver|operator|monitor)|fahrerlos/i.test(q)) throw new Error('Fahrerlosigkeit nicht belegt');
  }
  for(const name of ['launchedOn','announcedOn']) if (raw[name] != null && (!validDay(raw[name]) || raw[name]>today)) throw new Error('Ungültiges Ereignisdatum');
  if (raw.status==='announced' && raw.launchedOn) throw new Error('Ankündigung mit tatsächlichem Start');
  // Only dates parsed from the actual HTML are authoritative, never model dates.
  const publishedOn=page.publishedOn || null;
  if (!page.dynamic && !publishedOn) throw new Error('Datierte Meldung ohne belegtes Veröffentlichungsdatum');
  if (publishedOn && publishedOn>today) throw new Error('Quelle liegt in Zukunft');
  const id=[provider,raw.cityKey,raw.operator].join('-').toLowerCase().replace(/[^a-z0-9-]/g,'-');
  return {id,provider,cityKey:raw.cityKey,operator:raw.operator,platform:raw.platform,status:raw.status,driving:raw.driving,announcedOn:raw.announcedOn||null,launchedOn:raw.launchedOn||null,target:makeTarget(raw.target),notes:requiredText(raw.notes,700),review:'automatic',source:{url:page.url,title:page.title.slice(0,220),publishedOn,dynamic:page.dynamic,checkedAt:today},history:[]};
}
export {evidenceDay,mergeRecords} from '../../public/merge.js';
