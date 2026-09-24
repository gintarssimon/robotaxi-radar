import {OPERATORS} from './sources.mjs';
import {validDay} from './core.mjs';
import {extractTargets} from './announcement-dates.mjs';
export const ARTICLE_HOSTS={Waymo:['waymo.com','www.waymo.com'],Uber:['uber.com','www.uber.com','investor.uber.com'],Lyft:['lyft.com','www.lyft.com','investor.lyft.com'],Tesla:['tesla.com','www.tesla.com']};
const clean=s=>String(s||'').normalize('NFKC').replace(/[‐‑–—]/g,'-').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
const escaped=s=>s.replace(/[.*+?^{}$()|[\]\\]/g,'\\$&');
const contains=(text,name)=>new RegExp('(?<![\\p{L}\\p{N}])'+escaped(clean(name))+'(?![\\p{L}\\p{N}])','iu').test(text);
export const findCities=(text,cities)=>Object.entries(cities).filter(([key,c])=>[c.name,key.replace(/-/g,' '),...(c.aliases||[])].some(name=>contains(text,name))).map(([key])=>key);
const AUTONOMOUS=/robotaxi|driverless|fully autonomous|autonomous (?:ride|vehicle|taxi)|self-driving|fahrerlos|vollautonom|autonome[nrs]? (?:Taxi|Fahr|Mobilität)/i;
const SERVICE=/ride[- ]hailing|robotaxi (?:service|rides)|robotaxis|commercial (?:ride|service)|(?:rides|service).{0,50}(?:public|riders|passengers)|Fahrdienst|Robotaxi[- ]Dienst|Fahrgastbetrieb/i;
const OPENING=/\b(?:launch|open|introduce|offer|bring|start|begin|roll out|make.{0,30}available|zugänglich machen|anbieten|starten|einführen|eröffnen)\b/i;
const INTENT=/\b(?:will|plan(?:s|ning)?|aim(?:s)?|intend(?:s)?|expect(?:s)?|target(?:s)?|set to|slated|prepar(?:e|es|ing)|laying (?:the )?(?:foundation|groundwork)|wollen|planen|plant|werden|wird|möchten|beabsichtigen|sollen|soll)\b/i;
const NEGATIVE=/\b(?:no plans|not (?:planning|launching|opening)|won't|will not|cancel(?:led|ed)?|postpon(?:e|ed)|keine Pläne|nicht (?:starten|anbieten)|abgesagt|verschoben)\b/i;
const precision=t=>({day:6,month:5,quarter:4,half:3,year:t.qualifier?2:1}[t.precision]||0);
const compatible=(a,b)=>!(a.qualifier&&b.qualifier&&a.qualifier!==b.qualifier)&&((a.start<=b.start&&a.end>=b.end)||(b.start<=a.start&&b.end>=a.end));
export function operatorFor(provider,context){
  if(['Waymo','Tesla'].includes(provider))return provider;
  const matches=OPERATORS.filter(n=>!['Unbekannt',provider].includes(n)&&contains(context,n));
  if(/Apollo Go|Baidu/i.test(context)&&!matches.includes('Baidu Apollo Go'))matches.push('Baidu Apollo Go');
  return matches.length===1?matches[0]:null;
}
const excerpt=(s,n)=>clean(s).split(/\s+/).slice(0,n).join(' ');
const sentences=block=>block.replace(/\bSt\./g,'St§').replace(/\bD\.C\./g,'D§C§').split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ“"])/u).map(s=>s.replaceAll('§','.'));
export function parseAnnouncements(provider,page,cities,today){
  const records=[],issues=[];
  if(!page.isArticle||page.dynamic||!ARTICLE_HOSTS[provider]?.includes(new URL(page.url).hostname))return {records,issues};
  const title=clean(page.title),text=clean(page.text);
  if(!AUTONOMOUS.test(title+' '+text))return {records,issues};
  if(!validDay(page.publishedOn)||page.publishedOn>today){issues.push({reason:'Veröffentlichungsdatum fehlt oder liegt in der Zukunft; Artikel prüfen.'});return {records,issues};}
  const focused=findCities(title,cities),groups=new Map();
  for(const block of (page.blocks?.length?page.blocks:[text]).map(clean)){
    const blockCities=findCities(block,cities);
    for(const full of sentences(block)){
      const clauses=full.split(/\bbefore\b|\bwhereas\b|\bwhile\b|\bbevor\b/i);
      const openings=clauses.filter(s=>SERVICE.test(s)&&OPENING.test(s)&&INTENT.test(s));
      const sentence=openings.length===1?openings[0]:full;
      if(!SERVICE.test(sentence)||!OPENING.test(sentence)||!INTENT.test(sentence))continue;
      if(/\b(?:test(?:ing)?|pilot|trial|mapping|Kartierung|Testfahrten|Testbetrieb)\b/i.test(sentence)){issues.push({reason:'Test- oder Pilotphase nicht eindeutig vom öffentlichen Start getrennt.'});continue;}
      const dates=extractTargets(sentence,page.publishedOn);
      let keys=findCities(sentence,cities);
      const unfamiliarPlace=[...sentence.matchAll(/\b(?:in|to)\s+([A-ZÄÖÜ][\p{L}]+(?:\s+[A-ZÄÖÜ][\p{L}]+){0,2})/gu)].some(m=>!findCities(m[1],cities).length&&!dates.some(d=>m.index<d.end&&m.index+m[0].length>d.index));
      if(!keys.length&&unfamiliarPlace){issues.push({reason:'Expliziter Ort im Startsatz ist nicht eindeutig im Ortskatalog zugeordnet.'});continue;}
      if(!keys.length&&blockCities.length===1)keys=blockCities;
      if(!keys.length&&!blockCities.length&&focused.length===1)keys=focused;
      if(!keys.length){issues.push({reason:'Ankündigung ohne eindeutig zuordenbare Stadt im Ortskatalog.'});continue;}
      if(NEGATIVE.test(full)){issues.push({reason:'Verneinung, Absage oder Verschiebung muss geprüft werden.'});continue;}
      const operator=operatorFor(provider,title+' '+block);
      if(!operator){issues.push({reason:'Technologiepartner nicht eindeutig; Artikel prüfen.'});continue;}
      const targets=dates.filter(d=>d.target.end>=page.publishedOn);
      if(targets.length>1&&!targets.every(d=>compatible(d.target,targets[0].target))){
        issues.push({reason:'Mehrere unterschiedliche Zeiträume in einem Startsatz; Artikel prüfen.'});
        for(const key of keys)groups.set(key+'|'+operator,{conflict:true});continue;
      }
      const selected=targets.sort((a,b)=>precision(b.target)-precision(a.target))[0];
      for(const key of keys){
        const id=key+'|'+operator,prev=groups.get(id);
        if(prev?.conflict)continue;
        if(prev?.target&&selected&&!compatible(prev.target,selected.target)){groups.set(id,{conflict:true});issues.push({reason:'Widersprüchliche Startzeiträume für '+cities[key].name+'.'});continue;}
        if(!prev||selected&&(!prev.target||precision(selected.target)>precision(prev.target))){
          groups.set(id,{key,operator,target:selected?.target||null,evidence:{city:excerpt(title,10),launch:excerpt(sentence.slice(Math.max(0,(selected?.index||0)-40)),15)}});
        }
      }
    }
  }
  for(const item of groups.values()){
    if(item.conflict)continue;
    const {key,operator,target,evidence}=item;
    records.push({id:[provider,key,operator].join('-').toLowerCase().replace(/[^a-z0-9-]/g,'-'),provider,cityKey:key,operator,platform:provider==='Tesla'?'Tesla Robotaxi':provider,status:'announced',driving:'unknown',announcedOn:page.publishedOn,launchedOn:null,target,extraction:'announcement',evidence,review:'automatic',history:[],notes:'Offizielle Ankündigung automatisch erkannt. '+(target?'Geplanter öffentlicher Start: '+target.label+'.':'Kein eindeutig zugeordneter Starttermin erkannt.')+' Vorbereitung oder Tests sind kein belegter öffentlicher Fahrgastbetrieb. Genehmigungen und Terminänderungen bleiben möglich.',source:{url:page.url,title:page.title.slice(0,220),publishedOn:page.publishedOn,dynamic:false,checkedAt:today}});
  }
  if(!records.length&&!issues.length)issues.push({reason:'Keine eindeutige Ankündigung eines künftigen öffentlichen Fahrdienstes erkannt.'});
  return {records,issues};
}
