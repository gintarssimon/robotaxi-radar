import {ARTICLE_HOSTS,findCities,operatorFor} from './announcements.mjs';
import {validDay} from './core.mjs';
const normalize=s=>String(s||'').normalize('NFKC').replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
const FUTURE_OR_NEGATIVE=/\b(?:if|will|would|could|plan(?:s|ned)?|expect(?:s|ed)?|intend(?:s|ed)?|aim(?:s|ed)?|no|not|never|cancel(?:led|ed)?|paused|suspended|stopped)\b/i;
const LAUNCHED=/\b(?:today (?:launched|started|opened)|(?:has|have) (?:just )?launched|(?:rides|trips) are now available)\b/i;
const PUBLIC=/\b(?:rides|trips|service).{0,90}(?:available|open) to (?:the )?public\b|\b(?:public (?:ride-hailing|robotaxi) service|commercial (?:ride-hailing|robotaxi) service)\b/i;
// Deliberately narrow: the same statement must confirm a real launch, a city,
// and public passenger access. An expired target or an investment is not a launch.
export function parseLaunches(provider,page,cities,today){
  const records=[],issues=[];
  if(!page.isArticle||page.dynamic||!ARTICLE_HOSTS[provider]?.includes(new URL(page.url).hostname)||!validDay(page.publishedOn)||page.publishedOn>today)return {records,issues};
  const title=normalize(page.title),groups=new Map();
  for(const block of (page.blocks||[page.text]).map(normalize)){
    for(const sentence of block.split(/(?<=[.!?])\s+(?=[A-Z])/)){
      if(!LAUNCHED.test(sentence)||!PUBLIC.test(sentence)||FUTURE_OR_NEGATIVE.test(sentence)||sentence.includes('?')||!/autonomous|driverless|robotaxi|self-driving/i.test(sentence))continue;
      const keys=findCities(sentence,cities),operator=operatorFor(provider,title+' '+sentence);
      if(keys.length!==1||!operator){issues.push({reason:'Startmeldung ohne eindeutige Zuordnung von Stadt und Technologiepartner.'});continue;}
      const driving=/supervised|with (?:a )?(?:safety|human) driver|driver (?:is )?on ?board/i.test(sentence)?'supervised':/fully autonomous|driverless|without (?:a )?(?:human )?driver/i.test(sentence)?'driverless':'unknown';
      for(const cityKey of keys){
        const id=[provider,cityKey,operator].join('-').toLowerCase().replace(/[^a-z0-9-]/g,'-');
        const source={url:page.url,title:page.title.slice(0,220),publishedOn:page.publishedOn,dynamic:false,checkedAt:today};
        const prev=groups.get(id);
        if(prev&&prev.driving!==driving){groups.set(id,{conflict:true});continue;}
        groups.set(id,{id,provider,cityKey,operator,platform:provider==='Tesla'?'Tesla Robotaxi':provider,status:'live',driving,announcedOn:null,launchedOn:null,target:null,extraction:'launch',review:'automatic',history:[],source,drivingSource:driving==='unknown'?null:source,notes:'Die offizielle Meldung bestätigt bereits gestarteten öffentlichen Fahrgastbetrieb. '+(driving==='supervised'?'Begleitpersonal ist ausdrücklich genannt. ':driving==='driverless'?'Fahrerloser Betrieb ist ausdrücklich genannt. ':'Die Betriebsform ist nicht eindeutig belegt. ')+'Betrieb belegt am '+page.publishedOn+'. Veröffentlichungsdatum und tatsächlicher Starttag werden nicht gleichgesetzt.'});
      }
    }
  }
  for(const item of groups.values())if(item.conflict)issues.push({reason:'Widersprüchliche Angaben zur Betriebsform in der Startmeldung.'});else records.push(item);
  return {records,issues};
}
