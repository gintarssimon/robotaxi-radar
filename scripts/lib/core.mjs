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
export function evidenceDay(r) { return r.source.dynamic ? r.source.checkedAt : r.source.publishedOn || '0000-00-00'; }
export function mergeRecords(existing, candidates, today) {
  const records = new Map(existing.map(r=>[r.id,r]));
  let changed=0, ignored=0;
  for(const candidate of candidates.sort((a,b)=>evidenceDay(a).localeCompare(evidenceDay(b)))) {
    const prev=records.get(candidate.id);
    if(prev&&['announcement','availability'].includes(candidate.extraction)&&candidate.status==='announced'&&['live','limited','paused'].includes(prev.status)){ignored++;continue;}
    if(prev && evidenceDay(candidate)<evidenceDay(prev)){
      // Older launch articles may fill missing historical dates without changing
      // the newer availability status. A target retains its own dated evidence.
      if(candidate.status===prev.status){
        const enriched={...prev};let amended=false;
        for(const key of ['announcedOn','launchedOn'])if(!prev[key]&&candidate[key]){enriched[key]=candidate[key];amended=true;}
        if(candidate.target&&(!prev.target || evidenceDay(candidate)>(prev.targetSource?.publishedOn||'9999'))){enriched.target=candidate.target;enriched.targetSource=candidate.source;amended=true;}
        if(amended){enriched.additionalSources=[...(prev.additionalSources||[]),candidate.source].filter((s,i,a)=>a.findIndex(x=>x.url===s.url)===i).slice(-5);enriched.review='automatic';records.set(prev.id,enriched);changed++;continue;}
      }
      ignored++;continue;
    }
    // Do not let an undated aggregate page erase historically evidenced dates.
    const next=prev ? {...candidate,announcedOn:candidate.announcedOn||prev.announcedOn,launchedOn:candidate.launchedOn||prev.launchedOn,target:candidate.target||prev.target,targetSource:candidate.target?candidate.source:prev.targetSource||null,additionalSources:prev.additionalSources||[]} : {...candidate,targetSource:candidate.target?candidate.source:null};
    // A source that says nothing about onboard personnel does not contradict an
    // existing observation. Preserve that observation with its ORIGINAL source
    // date, so a fresh availability check cannot silently renew old evidence.
    if(candidate.driving==='unknown' && prev && prev.driving!=='unknown' && candidate.operator===prev.operator && ['live','limited'].includes(candidate.status) && ['live','limited'].includes(prev.status)){
      next.driving=prev.driving;
      next.drivingSource=prev.drivingSource||prev.source;
    }else{
      next.drivingSource=candidate.driving!=='unknown'?(candidate.drivingSource||candidate.source):null;
    }
    if(next.drivingSource&&next.drivingSource.url!==next.source.url)next.additionalSources=[...(next.additionalSources||[]),next.drivingSource].filter((s,i,a)=>a.findIndex(x=>x.url===s.url)===i).slice(-5);
    if(prev?.target && !candidate.target) next.additionalSources=[...(next.additionalSources||[]),prev.source].filter((s,i,a)=>a.findIndex(x=>x.url===s.url)===i).slice(-5);
    const substantive= !prev || ['status','driving','platform','launchedOn','announcedOn','target'].some(k=>JSON.stringify(prev[k])!==JSON.stringify(next[k]));
    // Preserve human review only when the record and its source are unchanged.
    if(prev && !substantive && prev.source.url===next.source.url && prev.notes===next.notes) next.review=prev.review;
    next.history=prev?.history||[];
    if(substantive && prev) next.history=[...next.history,{at:today,status:prev.status,driving:prev.driving,target:prev.target,sourceURL:prev.source.url}].slice(-12);
    if(substantive) changed++;
    records.set(next.id,next);
  }
  // Missing observations never delete or automatically pause a service.
  return {records:[...records.values()],changed,ignored};
}
