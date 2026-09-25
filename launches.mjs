import {ARTICLE_HOSTS,findCities,operatorFor,isRelevantArticle} from './announcements.mjs';
import {validDay} from './core.mjs';
const normalize=s=>String(s||'').normalize('NFKC').replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
const FUTURE_OR_NEGATIVE=/\b(?:if|will|would|could|plan(?:s|ned)?|expect(?:s|ed)?|intend(?:s|ed)?|aim(?:s|ed)?|no|not|never|cancel(?:led|ed)?|paused|suspended|stopped)\b/i;
const LAUNCHED=/\b(?:today (?:launched|started|opened|announced the launch of)|(?:has|have) (?:just )?launched|(?:has|have) begun offering|(?:rides|trips) are now available|can now (?:book|request|ride)|public (?:commercial )?operations (?:have )?(?:begun|began|started))\b/i;
const PUBLIC=/\bpublic(?:ly)?\b|\b(?:passenger rides|commercial (?:ride-hailing|robotaxi) service)|\briders.{0,100}(?:book|request)|\b(?:rides|trips).{0,100}(?:Uber|Lyft) app\b/i;
const SUPERVISED=/supervised|with (?:a )?(?:safety|human) driver|(?:driver|operator) (?:is )?on[ -]?board|(?:include|with|have).{0,30}(?:vehicle operator|safety operator|trained.{0,20}driver)|operator.{0,40}behind the wheel/i;
const split=block=>block.replace(/\b(?:Pony\.ai|St\.|D\.C\.)/g,s=>s.replaceAll('.','§')).split(/(?<=[.!?])\s+(?=[A-Z])/).map(s=>s.replaceAll('§','.'));
// Public access and a completed action must be explicit. A planned date or a
// testing permit alone never upgrades a record to passenger service.
export function parseLaunches(provider,page,cities,today){
  const records=[],issues=[];
  if(!page.isArticle||page.dynamic||!ARTICLE_HOSTS[provider]?.includes(new URL(page.url).hostname)||!validDay(page.publishedOn)||page.publishedOn>today||!isRelevantArticle(provider,page))return {records,issues};
  const title=normalize(page.title),groups=new Map(),focus=findCities(title,cities);
  for(const block of (page.blocks||[page.text]).map(normalize)){
    for(const full of split(block)){
      const sentence=full.split(/\bbefore\b|\bwhereas\b/)[0];
      if(!LAUNCHED.test(sentence)||!PUBLIC.test(sentence)||FUTURE_OR_NEGATIVE.test(sentence)||sentence.includes('?')||!/autonomous|driverless|robotaxi|self-driving/i.test(sentence))continue;
      const keys=findCities(sentence,cities),operator=operatorFor(provider,title+' '+sentence);
      if(keys.length!==1||!operator){issues.push({reason:'Startmeldung ohne eindeutige Zuordnung von Stadt und Technologiepartner.'});continue;}
      // Within a single-city launch article, explicit onboard supervision takes
      // priority over marketing language calling the technology "driverless".
      const supervision=focus.length===1&&focus[0]===keys[0]?(page.blocks||[]).filter(b=>{const places=findCities(b,cities);return (!places.length||places.length===1&&places[0]===keys[0])&&!/previous|formerly|follows|followed|last year|trial.{0,30}began|used to/i.test(b);}).join(' '):sentence;
      const driving=SUPERVISED.test(supervision)?'supervised':/fully autonomous|driverless|without (?:a )?(?:human )?driver/i.test(sentence)?'driverless':'unknown';
      for(const cityKey of keys){
        const id=[provider,cityKey,operator].join('-').toLowerCase().replace(/[^a-z0-9-]/g,'-');
        const source={url:page.url,title:page.title.slice(0,220),publishedOn:page.publishedOn,dynamic:false,checkedAt:today};
        const prev=groups.get(id);
        if(prev?.conflict)continue;
        if(prev&&prev.driving!=='unknown'&&driving==='unknown')continue;
        if(prev&&prev.driving!=='unknown'&&driving!=='unknown'&&prev.driving!==driving){groups.set(id,{conflict:true});continue;}
        groups.set(id,{id,provider,cityKey,operator,platform:provider==='Tesla'?'Tesla Robotaxi':provider,status:'live',driving,announcedOn:null,launchedOn:null,target:null,extraction:'launch',review:'automatic',history:[],source,drivingSource:driving==='unknown'?null:source,notes:'Die offizielle Meldung bestätigt bereits gestarteten öffentlichen Fahrgastbetrieb. '+(driving==='supervised'?'Begleitpersonal ist ausdrücklich genannt. ':driving==='driverless'?'Fahrerloser Betrieb ist ausdrücklich genannt. ':'Die Betriebsform ist nicht eindeutig belegt. ')+'Betrieb belegt am '+page.publishedOn+'. Veröffentlichungsdatum und tatsächlicher Starttag werden nicht gleichgesetzt.'});
      }
    }
  }
  for(const item of groups.values())if(item.conflict)issues.push({reason:'Widersprüchliche Angaben zur Betriebsform in der Startmeldung.'});else records.push(item);
  return {records,issues};
}
