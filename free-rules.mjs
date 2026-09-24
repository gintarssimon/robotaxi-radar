// Conservative rules for known, explicit availability lists. No model or API key.
import {OPERATORS} from './sources.mjs';
const normalized=s=>String(s).normalize('NFKC').replace(/\s+/g,' ').toLowerCase();
function names(key,city){return [city.name,key.replace(/-/g,' '),...(city.aliases||[])];}
function contains(text,key,city){const n=normalized(text);return names(key,city).some(name=>{const safe=normalized(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(`(?:^|[^a-z])${safe}(?:$|[^a-z])`,'i').test(n);});}
function make(provider,key,status,page,today,extra={}){
  const operator=extra.operator||provider;
  const source={url:page.url,title:page.title,publishedOn:null,dynamic:true,checkedAt:today};
  return {id:[provider,key,operator].join('-').toLowerCase().replace(/[^a-z0-9-]/g,'-'),provider,cityKey:key,operator,platform:provider==='Tesla'?'Tesla Robotaxi':provider,status,driving:'unknown',announcedOn:null,launchedOn:null,target:null,extraction:'availability',notes:'Automatisch aus einer ausdrücklich bezeichneten Stadtliste erkannt. Die Quelle nennt hier keinen genauen Starttermin. Der Marker ist kein Betriebsgebiet.',review:'automatic',history:[],source,...extra,drivingSource:extra.driving&&extra.driving!=='unknown'?source:null};
}
// An availability list and a statement about the driving mode are separate facts.
// Use the service description, never a stray keyword in a news link or a city name.
function waymoDriving(page){
  const descriptions=(page.blocks?.length?page.blocks:[page.text]).flatMap(b=>b.split(/(?<=[.!?])\s+/));
  return descriptions.some(s=>! /\b(?:not|never|will|plan|test|pilot|safety driver|safety operator)\b/i.test(s)&&/\b(?:fully autonomous|driverless)\b.{0,80}\b(?:service|rides|ride-hailing)\b/i.test(s))?'driverless':'unknown';
}
export function parseAvailability(provider,page,cities,today){
  const out=[];
  const address=new URL(page.url),host=address.hostname.replace(/^www\./,'');
  if(['Waymo','Uber'].includes(provider)&&host==='waymo.com'&&['/','/rides/','/rides'].includes(address.pathname)){
    const live=page.text.match(/Serving Riders In([\s\S]{10,3500}?)Up Next/i)?.[1];
    const next=page.text.match(/Up Next([\s\S]{10,3500}?)(?:Sign up for updates|Serving Riders In|Why they ride)/i)?.[1];
    if(!live||!next)throw new Error('Waymo-Stadtlisten nicht eindeutig erkannt; alte Einträge bleiben erhalten.');
    const driverless=waymoDriving(page);
    for(const [key,city] of Object.entries(cities)){
      if(contains(live,key,city)){
        const viaUber=names(key,city).some(name=>{const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(`${escaped}\\s*,?\\s*(?:[A-Z]{2})?\\s*Ride on Uber`,'i').test(live);});
        if(provider==='Waymo')out.push(make(provider,key,'live',page,today,{driving:driverless,platform:viaUber?'Uber':'Waymo'}));
        else if(viaUber)out.push(make(provider,key,'live',page,today,{operator:'Waymo',driving:driverless}));
      }else if(provider==='Waymo'&&contains(next,key,city))out.push(make(provider,key,'announced',page,today));
    }
    if(provider==='Waymo'&&out.filter(r=>r.status==='live').length<2)throw new Error('Unvollständige Waymo-Liste; keine Aktualisierung.');
  }
  if(provider==='Tesla'&&host==='tesla.com'&&address.pathname==='/support/robotaxi'){
    const available=page.text.match(/Currently,?\s+we provide service in\s+(?:limited\s+)?areas of\s+([^.!?]{5,1500})[.!?]/i)?.[1];
    if(!available)throw new Error('Tesla-Verfügbarkeitsliste nicht erkannt; alte Einträge bleiben erhalten.');
    for(const [key,city]of Object.entries(cities))if(contains(available,key,city))out.push(make(provider,key,'live',page,today));
    if(!out.length)throw new Error('Keine bekannte Stadt in der Tesla-Liste erkannt.');
  }
  if(provider==='Uber'&&host==='uber.com'&&/^\/us\/en\/r\/autonomous\/[^/]+\/$/.test(address.pathname)){
    const partners=OPERATORS.filter(name=>name!=='Unbekannt'&&normalized(page.title).includes(normalized(name)));
    const keys=Object.entries(cities).filter(([key,city])=>contains(page.title,key,city)).map(([key])=>key);
    if(keys.length!==1||partners.length!==1)throw new Error('Uber-Stadt oder Technologiepartner nicht eindeutig erkannt.');
    const available=(page.blocks||[page.text]).find(b=>/Uber has partnered with .{2,50} to make autonomous rides available through the Uber app in /i.test(b)&&contains(b,keys[0],cities[keys[0]])&&normalized(b).includes(normalized(partners[0])));
    if(!available)throw new Error('Uber-Fahrgastbetrieb nicht eindeutig bestätigt.');
    const driving=partnerDriving(page);
    out.push(make(provider,keys[0],'live',page,today,{operator:partners[0],driving,notes:'Aktuelle offizielle Buchungsseite für autonome Fahrten. Vermittlung über Uber; Fahrzeuge und Fahrsystem von '+partners[0]+'. Die Verfügbarkeit hängt vom Bediengebiet und passenden Fahrzeugen ab.'}));
  }
  if(provider==='Lyft'&&host==='lyft.com'&&/^\/autonomous\/(waymo|maymobility)\/?$/.test(address.pathname)){
    const operator=address.pathname.includes('maymobility')?'May Mobility':'Waymo';
    if(!normalized(page.text).includes(normalized(operator)))throw new Error('Lyft-Technologiepartner nicht im Seiteninhalt bestätigt.');
    const available=(page.blocks||[page.text]).filter(b=>/(?:Waymo|autonomous) rides are now available (?:on Lyft )?in /i.test(b));
    const keys=Object.entries(cities).filter(([key,city])=>available.some(b=>contains(b,key,city))).map(([key])=>key);
    if(!keys.length)throw new Error('Lyft-Fahrgastbetrieb nicht eindeutig bestätigt.');
    const pilot=/during our pilot program/i.test(page.text),driving=partnerDriving(page);
    for(const key of keys)out.push(make(provider,key,pilot?'limited':'live',page,today,{operator,driving,notes:'Öffentlich vermittelte Fahrgastfahrten über Lyft mit '+operator+'. '+(pilot?'Als Pilotprogramm mit begrenztem Angebot beschrieben.':'Verfügbarkeit je nach Bediengebiet und Fahrzeugen.')}));
  }
  return out;
}
function partnerDriving(page){
  const blocks=page.blocks||[page.text];
  const supervised=blocks.some(b=>/(?:an? (?:on[- ]?board|autonomous vehicle|AV) (?:specialist|operator)|safety (?:driver|operator)).{0,55}(?:sits|will be|is present|will remain|is in)|(?:a trained|an on[- ]?board) (?:safety )?(?:driver|operator).{0,40}(?:accompany|monitor)/i.test(b));
  if(supervised)return 'supervised';
  const driverless=blocks.some(b=>! /\b(?:will|plan|future|not|pilot)\b/i.test(b)&&/fully autonomous vehicles|with no one behind the wheel|without (?:a |any )?(?:human |safety )?driver (?:on ?board|behind the wheel)/i.test(b));
  return driverless?'driverless':'unknown';
}
