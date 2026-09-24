import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAnnouncements} from '../scripts/lib/announcements.mjs';
import {extractTargets} from '../scripts/lib/announcement-dates.mjs';
import {mergeRecords} from '../scripts/lib/core.mjs';
import {parseHTML,sitemapLinks,chooseArticles,crawlProvider,PARSER_VERSION} from '../scripts/lib/crawl.mjs';
import {parseAvailability} from '../scripts/lib/free-rules.mjs';
const today='2026-09-24';
const cities={munich:{name:'München'},berlin:{name:'Berlin'},singapore:{name:'Singapur'},london:{name:'London'},austin:{name:'Austin'},atlanta:{name:'Atlanta'},houston:{name:'Houston'}};
const page=(blocks,overrides={})=>({url:'https://waymo.com/blog/2026/08/next-city/',title:'Waymo prepares for Munich',publishedOn:'2026-08-25',isArticle:true,dynamic:false,blocks,text:blocks.join(' '),...overrides});
const analyze=p=>parseAnnouncements('Waymo',p,cities,today);
const planned=()=>analyze(page(['We plan to launch fully autonomous ride-hailing in Munich in late 2027.'])).records[0];
test('Munich pattern separates mapping from a public opening at the end of a year',()=>{
  const {records,issues}=analyze(page(['We are preparing our fully autonomous ride-hailing service in Munich.','Our vehicles will map local streets in 2026 before we aim to open commercial ride-hailing to the public towards the end of 2027.']));
  assert.equal(records.length,1);assert.deepEqual(issues,[]);
  assert.equal(records[0].cityKey,'munich');assert.equal(records[0].target.label,'Ende 2027');assert.equal(records[0].target.precision,'year');
  assert.equal(records[0].announcedOn,'2026-08-25');assert.equal(records[0].status,'announced');assert.equal(records[0].launchedOn,null);assert.equal(records[0].driving,'unknown');
});
test('The rule also works for another city and year without a special URL',()=>{
  const r=analyze(page(['We plan to offer fully autonomous ride-hailing in Berlin in 2029.'],{title:'Berlin expansion'})).records[0];
  assert.equal(r.cityKey,'berlin');assert.equal(r.target.label,'2029');
});
test('Preparation and environmental dates cannot replace the public launch year',()=>{
  const {records}=analyze(page(['We intend to introduce fully autonomous ride-hailing in Singapore in 2028.','Our specialists will conduct manual driving in 2027.','Our fleet supports a green energy plan for 2030.'],{title:'Singapore expansion'}));
  assert.equal(records.length,1);assert.equal(records[0].target.label,'2028');
});
test('Different cities and dates are associated within their own statements',()=>{
  const {records}=analyze(page(['We plan to launch fully autonomous ride-hailing in Munich in 2027. We plan to launch fully autonomous ride-hailing in Berlin in 2028.'],{title:'Two future cities'}));
  assert.equal(records.find(r=>r.cityKey==='munich').target.label,'2027');assert.equal(records.find(r=>r.cityKey==='berlin').target.label,'2028');
});
test('Conflicting dates for one city require review',()=>{
  const r=analyze(page(['We plan to launch fully autonomous ride-hailing in Munich in 2027.','We aim to open our ride-hailing service in Munich in 2028.']));
  assert.equal(r.records.length,0);assert.ok(r.issues.length);
});
test('Negation, pilot programmes and office openings do not become public launches',()=>{
  for(const body of ['We will not launch fully autonomous ride-hailing in Munich in 2027.','We plan to launch a robotaxi pilot in Munich in 2027.','Our fully autonomous fleet is growing. We plan to open an office in Munich in 2027.'])assert.equal(analyze(page([body])).records.length,0);
});
test('A missing launch date remains unknown',()=>{
  const {records}=analyze(page(['We plan to launch fully autonomous ride-hailing in Munich.','We opened our London office in 2024.']));
  assert.equal(records.length,1);assert.equal(records[0].target,null);
});
test('Unknown explicit locations cannot borrow a city from the title',()=>{
  const r=analyze(page(['Our fully autonomous fleet is growing.','We plan to launch ride-hailing in Exampleville in 2027.']));
  assert.equal(r.records.length,0);assert.ok(r.issues.length);
});
test('Ambiguous partners require review; explicit partners work for Uber and Lyft',()=>{
  const unknown=parseAnnouncements('Uber',page(['We plan to launch fully autonomous ride-hailing in Munich in 2027.'],{url:'https://www.uber.com/newsroom/plans/',title:'Uber in Munich'}),cities,today);
  assert.equal(unknown.records.length,0);assert.ok(unknown.issues.length);
  for(const [provider,host,operator]of [['Uber','www.uber.com','Autobrains'],['Lyft','www.lyft.com','Waymo']]){
    const p=page(['Together with '+operator+', we plan to launch fully autonomous ride-hailing in Munich in 2027.'],{url:'https://'+host+'/blog/posts/new-city',title:provider+' and '+operator+' prepare for Munich'});
    const r=parseAnnouncements(provider,p,cities,today).records[0];assert.equal(r.operator,operator);assert.equal(r.platform,provider);
  }
});
test('Only dated articles from the provider itself are eligible',()=>{
  const base=page(['We plan to launch fully autonomous ride-hailing in Munich in 2027.']);
  for(const change of [{publishedOn:null},{publishedOn:'2028-01-01'},{url:'https://news.example/article'},{isArticle:false}])assert.equal(analyze({...base,...change}).records.length,0);
  assert.equal(parseAnnouncements('Uber',base,cities,today).records.length,0);
});
test('An overdue target stays announced and cannot downgrade active service',()=>{
  const r=planned(),live={...r,status:'live',source:{...r.source,publishedOn:'2026-01-01'}};
  assert.equal(mergeRecords([live],[r],today).records[0].status,'live');
  assert.equal(parseAnnouncements('Waymo',page(['We plan to launch fully autonomous ride-hailing in Munich in 2027.']),cities,'2029-01-01').records[0].status,'announced');
});
test('An older article enriches a current city list without erasing its source',()=>{
  const article=planned(),list={...article,target:null,announcedOn:null,extraction:undefined,source:{url:'https://waymo.com/',title:'Cities',dynamic:true,checkedAt:today,publishedOn:null}};
  const r=mergeRecords([list],[article],today).records[0];
  assert.equal(r.target.label,'Ende 2027');assert.equal(r.targetSource.url,article.source.url);assert.equal(r.announcedOn,'2026-08-25');
});
test('Date precision and relative years are preserved',()=>{
  for(const [text,label]of [['in 2028','2028'],['in Q3 2027','Q3 2027'],['in the second half of 2027','2. Halbjahr 2027'],['in June 2027','Juni 2027'],['on June 15, 2027','15.06.2027'],['am 15. Juni 2027','15.06.2027'],['late next year','Ende 2027'],['gegen Ende 2027','Ende 2027']]){
    const dates=extractTargets(text,'2026-08-25');assert.equal(dates.length,1,text);assert.equal(dates[0].target.label,label,text);
  }
  assert.equal(extractTargets('February 30, 2027','2026-08-25').length,0);
});
test('German launch statements and English city aliases are recognized',()=>{
  const {records}=analyze(page(['Unser vollautonomer Fahrdienst kommt nach München.','Gegen Ende 2027 wollen wir unseren Fahrdienst für die Öffentlichkeit zugänglich machen.'],{title:'Waymo in München'}));
  assert.equal(records[0].target.label,'Ende 2027');assert.equal(records[0].cityKey,'munich');
});
test('Sitemap discovery includes a past announcement and excludes external/future links',()=>{
  const xml='<urlset>'+['https://waymo.com/blog/2026/08/waymo-in-munich/','https://evil.example/blog/2026/09/launch/','https://waymo.com/blog/2029/01/launch/'].map(url=>'<url><loc>'+url+'</loc></url>').join('')+'</urlset>';
  assert.deepEqual(sitemapLinks(xml,['waymo.com'],today).map(x=>x.url),['https://waymo.com/blog/2026/08/waymo-in-munich/']);
});
test('The daily budget rotates through unseen news and respects the weekly cache',()=>{
  const links=Array.from({length:12},(_,i)=>({url:'https://waymo.com/blog/2026/08/launch-'+i+'/'}));
  const first=chooseArticles(links,{},'Waymo',today),state=Object.fromEntries(first.map(p=>['Waymo|'+p.url,{checkedAt:today,lastAttempt:today,parserVersion:PARSER_VERSION}]));
  const next=chooseArticles(links,state,'Waymo','2026-09-25');
  assert.equal(first.length,8);assert.equal(next.length,4);assert.ok(next.every(p=>!first.some(f=>f.url===p.url)));
});
test('A launch date in body text is never used as the publication date',()=>{
  const html='<main><article><h1>Robotaxi plans for Munich</h1><p>We plan to launch our fully autonomous ride-hailing service in Munich on June 15, 2027. Further preparation will be required to serve future riders safely.</p></article></main>';
  const p=parseHTML(html,'https://waymo.com/blog/2026/08/plans/',{},['waymo.com']);assert.equal(p.publishedOn,null);assert.equal(analyze(p).records.length,0);
});
test('Adjacent HTML elements preserve city and partner boundaries',()=>{
  const html='<main><p>Our fully autonomous ride-hailing service is growing across several cities.</p><h2>Serving Riders In</h2><button>Atlanta, GA</button><span>Ride on Uber</span><button>Austin, TX</button><span>Ride on Uber</span><button>Houston, TX</button><h2>Up Next</h2><button>London, UK</button><p>Sign up for updates</p></main>';
  const p=parseHTML(html,'https://waymo.com/',{dynamic:true},['waymo.com']);
  assert.equal(parseAvailability('Waymo',p,cities,today).filter(r=>r.status==='live').length,3);
  assert.deepEqual(parseAvailability('Uber',p,cities,today).map(r=>r.cityKey).sort(),['atlanta','austin']);
});
test('A 429 stops further requests to that host within the same run',async t=>{
  let count=0;t.mock.method(globalThis,'fetch',async()=>{count++;return new Response('',{status:429});});
  const r=await crawlProvider({hosts:['www.lyft.com'],pages:[{url:'https://www.lyft.com/blog',kind:'index'},{url:'https://www.lyft.com/autonomous',dynamic:true}]},{provider:'Lyft',today,pauseMs:0});
  assert.equal(count,1);assert.equal(r.errors.length,1);assert.equal(r.pages.length,0);
});
