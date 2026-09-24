import {writeFile} from 'node:fs/promises';
const coords=`san-francisco|San Francisco Bay Area|37.7749|-122.4194
los-angeles|Los Angeles|34.0522|-118.2437
phoenix|Phoenix|33.4484|-112.074
austin|Austin|30.2672|-97.7431
atlanta|Atlanta|33.749|-84.388
dallas|Dallas|32.7767|-96.797
houston|Houston|29.7604|-95.3698
miami|Miami|25.7617|-80.1918
nashville|Nashville|36.1627|-86.7816
orlando|Orlando|28.5383|-81.3792
san-antonio|San Antonio|29.4241|-98.4936
denver|Denver|39.7392|-104.9903
san-diego|San Diego|32.7157|-117.1611
tampa|Tampa|27.9506|-82.4572
las-vegas|Las Vegas|36.1699|-115.1398
baltimore|Baltimore|39.2904|-76.6122
boston|Boston|42.3601|-71.0589
charlotte|Charlotte|35.2271|-80.8431
chicago|Chicago|41.8781|-87.6298
detroit|Detroit|42.3314|-83.0458
minneapolis|Minneapolis|44.9778|-93.265
new-orleans|New Orleans|29.9511|-90.0715
new-york|New York|40.7128|-74.006
philadelphia|Philadelphia|39.9526|-75.1652
pittsburgh|Pittsburgh|40.4406|-79.9959
portland|Portland|45.5152|-122.6784
sacramento|Sacramento|38.5816|-121.4944
seattle|Seattle|47.6062|-122.3321
st-louis|St. Louis|38.627|-90.1994
washington|Washington, D.C.|38.9072|-77.0369
arlington|Arlington, Texas|32.7357|-97.1081
san-jose|San Jose|37.3382|-121.8863
london|London|51.5074|-.1278|Großbritannien|Europa
munich|München|48.1351|11.582|Deutschland|Europa
hamburg|Hamburg|53.5511|9.9937|Deutschland|Europa
berlin|Berlin|52.52|13.405|Deutschland|Europa
paris|Paris|48.8566|2.3522|Frankreich|Europa
zurich|Zürich|47.3769|8.5417|Schweiz|Europa
tokyo|Tokio|35.6762|139.6503|Japan|Asien
singapore|Singapur|1.3521|103.8198|Singapur|Asien
abu-dhabi|Abu Dhabi|24.4539|54.3773|VAE|Naher Osten
dubai|Dubai|25.2048|55.2708|VAE|Naher Osten
riyadh|Riad|24.7136|46.6753|Saudi-Arabien|Naher Osten
doha|Doha|25.2854|51.531|Katar|Naher Osten
toronto|Toronto|43.6532|-79.3832|Kanada|Nordamerika
vancouver|Vancouver|49.2827|-123.1207|Kanada|Nordamerika
seoul|Seoul|37.5665|126.978|Südkorea|Asien
hong-kong|Hongkong|22.3193|114.1694|China|Asien
beijing|Peking|39.9042|116.4074|China|Asien
shanghai|Shanghai|31.2304|121.4737|China|Asien`;
const cities=Object.fromEntries(coords.split('\n').map(line=>{const [id,name,lat,lng,country='USA',region='Nordamerika']=line.split('|');return [id,{name,lat:+lat,lng:+lng,country,region}]}));
const checkedAt='2026-09-23';
const source=(url,title,publishedOn=null,dynamic=false)=>({url,title,publishedOn,dynamic,checkedAt});
const waymo=source('https://waymo.com/','Waymo · Serving Riders In / Up Next',null,true);
const tesla=source('https://www.tesla.com/support/robotaxi','Tesla · Robotaxi-Verfügbarkeit',null,true);
const records=[];
function add(provider,cityKey,status,driving,src,extra={}) { const operator=extra.operator||provider,platform=extra.platform||provider; records.push({id:[provider,cityKey,operator].join('-').toLowerCase().replace(/[^a-z0-9-]/g,'-'),provider,cityKey,operator,platform,status,driving,announcedOn:null,launchedOn:null,target:null,notes:'Der Marker bezeichnet die Stadt. Das konkrete Fahrgebiet und der Zugang können eingeschränkt sein.',review:'source-reviewed',source:{...src},history:[],...extra}); }
for(const key of ['atlanta','austin','dallas','denver','houston','las-vegas','los-angeles','miami','nashville','orlando','phoenix','san-antonio','san-diego','san-francisco','tampa']) add('Waymo',key,'live','driverless',waymo,{platform:['atlanta','austin'].includes(key)?'Uber':'Waymo'});
for(const key of ['baltimore','boston','charlotte','chicago','detroit','london','minneapolis','new-orleans','new-york','philadelphia','pittsburgh','portland','sacramento','seattle','st-louis','tokyo','washington']) add('Waymo',key,'announced','unknown',waymo,{notes:'Auf der Anbieterseite als künftiger Markt geführt. Das ist kein Beleg für einen bereits laufenden Fahrgastbetrieb.'});
const london=records.find(r=>r.cityKey==='london'); london.target={label:'2026',start:'2026-01-01',end:'2026-12-31',precision:'year'};london.announcedOn='2025-10-15';london.notes='Als künftiger Markt gelistet. Zieljahr 2026 laut ursprünglicher Ankündigung; kein taggenauer Start bestätigt.';london.additionalSources=[source('https://waymo.com/blog/2025/10/hello-london-your-waymo-ride-is-arriving/','Waymo · Ankündigung London','2025-10-15')];
add('Waymo','singapore','announced','unknown',source('https://waymo.com/blog/2026/09/waymo-in-singapore/','Waymo · Ankündigung Singapur','2026-09-17'),{announcedOn:'2026-09-17',target:{label:'2028',start:'2028-01-01',end:'2028-12-31',precision:'year'},notes:'Kommerzieller Start für 2028 angekündigt; Vorbereitung mit Spezialisten für 2027 geplant. Behördliche Freigaben bleiben Voraussetzung.'});
for(const key of ['austin','dallas','houston','miami','orlando','tampa']) add('Tesla',key,'live','unknown',tesla,{platform:'Tesla Robotaxi',notes:'Als verfügbares Robotaxi-Gebiet geführt. Die allgemeine Supportseite belegt nicht für jede Fahrt die Abwesenheit von Begleitpersonal; Fahrerlosigkeit daher hier ungeklärt.'});
for(const key of ['austin','atlanta']) add('Uber',key,'live','driverless',waymo,{operator:'Waymo',notes:'Waymo verweist für diese Stadt auf die Buchung über Uber. Der zugehörige Waymo-Eintrag bildet dieselbe Partnerschaft ab.'});
add('Lyft','nashville','live','driverless',source('https://www.lyft.com/blog/posts/waymo-rides-now-available-on-the-lyft-app-in-nashville','Lyft · Waymo-Fahrten in Nashville','2026-09-09'),{operator:'Waymo',launchedOn:'2026-09-09',announcedOn:'2025-09-17',notes:'Vermittlung von Waymo-Fahrten über Lyft im zentralen Stadtgebiet. Die Verfügbarkeit wird schrittweise erweitert.'});
add('Lyft','atlanta','testing','supervised',source('https://www.lyft.com/blog/posts/a-new-chapter-for-rideshare-lyft-and-may-mobility-bring-autonomous-vehicles','Lyft · May-Mobility-Pilot in Atlanta','2025-09-10'),{operator:'May Mobility',launchedOn:'2025-09-10',notes:'Die Startmeldung beschreibt einen Pilotbetrieb mit Begleitpersonal. Der historische Beleg bestätigt nicht den heutigen Betriebsumfang.'});
add('Uber','abu-dhabi','live','driverless',source('https://investor.uber.com/news-events/news/press-release-details/2025/WeRide-and-Uber-Launch-Middle-Easts-First-Fully-Driverless-Robotaxi-Commercial-Operations-in-Abu-Dhabi-UAE/','Uber · Fahrerloser kommerzieller Start Abu Dhabi','2025-11-26'),{operator:'WeRide',launchedOn:'2025-11-26',notes:'Fahrerloser kommerzieller Start laut damaliger Meldung. Ein neuerer Betriebsbeleg ist in dieser Auswahl noch nicht hinterlegt.'});
await writeFile('public/data/cities.json',JSON.stringify(cities,null,2));await writeFile('public/data/seed.json',JSON.stringify({schemaVersion:1,mode:'sample',asOf:checkedAt,coverage:'Recherchierte, unvollständige Startauswahl',lastRun:null,records},null,2));console.log(`${records.length} Einträge, ${Object.keys(cities).length} unterstützte Orte`);
