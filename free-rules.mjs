// Conservative rules for known, explicit availability lists. No model or API key.
const normalized=s=>String(s).normalize('NFKC').replace(/\s+/g,' ').toLowerCase();
function names(key,city){return [city.name,key.replace(/-/g,' '),...(city.aliases||[])];}
function contains(text,key,city){const n=normalized(text);return names(key,city).some(name=>{const safe=normalized(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(`(?:^|[^a-z])${safe}(?:$|[^a-z])`,'i').test(n);});}
function make(provider,key,status,page,today,extra={}){
  const operator=extra.operator||provider;
  return {id:[provider,key,operator].join('-').toLowerCase().replace(/[^a-z0-9-]/g,'-'),provider,cityKey:key,operator,platform:provider==='Tesla'?'Tesla Robotaxi':provider,status,driving:'unknown',announcedOn:null,launchedOn:null,target:null,notes:'Automatisch aus einer ausdrücklich bezeichneten Stadtliste erkannt. Die Quelle nennt hier keinen genauen Starttermin. Der Marker ist kein Betriebsgebiet.',review:'automatic',history:[],source:{url:page.url,title:page.title,publishedOn:null,dynamic:true,checkedAt:today},...extra};
}
export function parseAvailability(provider,page,cities,today){
  const out=[];
  if(['Waymo','Uber'].includes(provider)&&new URL(page.url).hostname.replace(/^www\./,'')==='waymo.com'&&new URL(page.url).pathname==='/'){
    const live=page.text.match(/Serving Riders In([\s\S]{10,3500}?)Up Next/i)?.[1];
    const next=page.text.match(/Up Next([\s\S]{10,3500}?)(?:Sign up for updates|Serving Riders In|Why they ride)/i)?.[1];
    if(!live||!next)throw new Error('Waymo-Stadtlisten nicht eindeutig erkannt; alte Einträge bleiben erhalten.');
    const driverless=/fully autonomous|driverless/i.test(page.text)?'driverless':'unknown';
    for(const [key,city] of Object.entries(cities)){
      if(contains(live,key,city)){
        const viaUber=names(key,city).some(name=>{const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(`${escaped}\\s*,?\\s*(?:[A-Z]{2})?\\s*Ride on Uber`,'i').test(live);});
        if(provider==='Waymo')out.push(make(provider,key,'live',page,today,{driving:driverless,platform:viaUber?'Uber':'Waymo'}));
        else if(viaUber)out.push(make(provider,key,'live',page,today,{operator:'Waymo',driving:driverless}));
      }else if(provider==='Waymo'&&contains(next,key,city))out.push(make(provider,key,'announced',page,today));
    }
    if(provider==='Waymo'&&out.filter(r=>r.status==='live').length<2)throw new Error('Unvollständige Waymo-Liste; keine Aktualisierung.');
  }
  if(provider==='Tesla'&&new URL(page.url).pathname==='/support/robotaxi'){
    const available=page.text.match(/Currently,?\s+we provide service in\s+(?:limited\s+)?areas of\s+([^.!?]{5,1500})[.!?]/i)?.[1];
    if(!available)throw new Error('Tesla-Verfügbarkeitsliste nicht erkannt; alte Einträge bleiben erhalten.');
    for(const [key,city]of Object.entries(cities))if(contains(available,key,city))out.push(make(provider,key,'live',page,today));
    if(!out.length)throw new Error('Keine bekannte Stadt in der Tesla-Liste erkannt.');
  }
  return out;
}
