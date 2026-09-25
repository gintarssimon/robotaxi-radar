import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyBaseline,RELEASE} from '../public/baseline.js';
import {mergeRecords} from '../public/merge.js';
import {rankRecords,filterRecords,hasPlannedService,STATUS} from '../public/model.js';
import {parseHTML,feedLinks,chooseArticles,isNewsArticleURL,PARSER_VERSION,crawlProvider} from '../scripts/lib/crawl.mjs';
import {analyzePage} from '../scripts/lib/analyze.mjs';
import {extractTargets} from '../scripts/lib/announcement-dates.mjs';
import {SOURCES,OPERATORS} from '../scripts/lib/sources.mjs';
const today='2026-09-24';
const baseline=JSON.parse(await readFile(new URL('../public/data/verified.json',import.meta.url)));
const cities=JSON.parse(await readFile(new URL('../public/data/cities.json',import.meta.url)));
const london=baseline.records.find(r=>r.id==='uber-london-wayve');
const article=(blocks,changes={})=>({url:'https://investor.uber.com/news-events/news/press-release-details/2026/test/default.aspx',isArticle:true,dynamic:false,title:'Uber and WeRide robotaxi update',publishedOn:'2026-08-01',blocks,text:blocks.join(' '),...changes});
test('London and all researched provider-city pairs appear without a successful crawl',()=>{
 const snapshot=applyBaseline({records:[],lastRun:{status:'failed'}},baseline,today);
 assert.equal(snapshot.records.find(r=>r.id===london.id).driving,'supervised');
 for(const [provider,city]of [['Uber','london'],['Uber','dubai'],['Uber','zagreb'],['Uber','riyadh'],['Uber','zurich'],['Uber','madrid'],['Uber','tokyo'],['Uber','munich'],['Uber','arlington'],['Uber','san-francisco'],['Uber','houston'],['Uber','los-angeles'],['Uber','miami'],['Lyft','london'],['Lyft','dallas']])assert.ok(snapshot.records.some(r=>r.provider===provider&&r.cityKey===city),provider+' '+city);
 assert.equal(snapshot.lastRun.status,'failed');assert.equal(snapshot.baselineVersion,RELEASE);
});
test('Baseline is idempotent, preserves extra records and never overwrites a newer pause',()=>{
 const paused={...london,status:'paused',source:{...london.source,publishedOn:'2026-09-20'}};
 const extra={...london,id:'other-market'};
 const first=applyBaseline({records:[paused,extra]},baseline,today),second=applyBaseline(first,baseline,today);
 assert.equal(first.records.find(r=>r.id===london.id).status,'paused');
 assert.ok(first.records.some(r=>r.id==='other-market'));assert.deepEqual(first,second);
});
test('Reviewed evidence wins at the same publication date without blocking newer evidence',()=>{
 const guessed={...london,driving:'unknown',review:'automatic'};
 assert.equal(mergeRecords([london],[guessed],today).records[0].review,'source-checked');
 const newer={...guessed,driving:'driverless',source:{...guessed.source,publishedOn:today}};
 assert.equal(mergeRecords([london],[newer],today).records[0].driving,'driverless');
});
test('Known services cannot be demoted by a newer generic plan or test announcement',()=>{
 for(const status of ['announced','testing','preparation'])assert.equal(mergeRecords([london],[{...london,status,source:{...london.source,publishedOn:today}}],today).records[0].status,'live');
});
test('Verified records have supported cities, partners, dates and statuses; tests are not operating',()=>{
 assert.equal(new Set(baseline.records.map(r=>r.id)).size,baseline.records.length);
 for(const r of baseline.records){assert.ok(cities[r.cityKey]);assert.ok(STATUS[r.status]);assert.ok(OPERATORS.includes(r.operator));assert.ok(r.source.publishedOn<=today);assert.ok(SOURCES[r.provider].hosts.includes(new URL(r.source.url).hostname));}
 assert.equal(rankRecords(baseline.records,new Date(today)).find(r=>r.provider==='Lyft').count,0);
 const lyftLondon=baseline.records.find(r=>r.id==='lyft-london-baidu-apollo-go');assert.equal(lyftLondon.status,'testing');assert.ok(hasPlannedService(lyftLondon));assert.equal(lyftLondon.target.label,'2027');
});
test('New aliases support English city searches and partner search',()=>{
 const rows=applyBaseline({records:[]},baseline,today).records;
 assert.ok(filterRecords(rows,{providers:['Uber'],region:'all',status:'all',search:'Wayve'},cities).some(r=>r.cityKey==='london'));
 assert.ok(filterRecords(rows,{providers:['Uber'],region:'all',status:'all',search:'Munich'},cities).some(r=>r.cityKey==='munich'));
});
test('Same-day cache keys use attempt version',()=>{
 const link={url:london.source.url},key='Uber|'+link.url;
 assert.equal(chooseArticles([link],{[key]:{checkedAt:today,lastAttempt:today,parserVersion:5,attemptVersion:5}},'Uber',today).length,1);
 assert.equal(chooseArticles([link],{[key]:{checkedAt:today,lastAttempt:today,parserVersion:6,attemptVersion:6}},'Uber',today).length,0);
});
test('Official RSS/Atom discovery retains bylines and rejects unrelated hosts',()=>{
 const url='https://ir.weride.ai/news-releases/news-release-details/new-market';
 const xml=`<rss><channel><item><title>Robotaxi launch</title><link>${url}</link><pubDate>Thu, 24 Sep 2026 08:00:00 GMT</pubDate></item><item><link>https://evil.test/newsroom/fake/</link></item></channel></rss>`;
 const links=feedLinks(xml,['ir.weride.ai']);assert.equal(links.length,1);assert.equal(links[0].publishedOn,today);
 assert.ok(isNewsArticleURL(url));assert.ok(isNewsArticleURL('https://investor.lyft.com/press-releases/detail/10/new-market'));
});
test('German bylines and investor date containers are publication evidence',()=>{
 const body='<p>Uber plant einen Robotaxi-Dienst in München. Ein späterer Start im Juni 2028 ist von weiteren Genehmigungen abhängig und noch kein Betrieb.</p>';
 const page=parseHTML('<main><div>1. Juni 2026</div><h1>Uber in München</h1>'+body+'</main>','https://www.uber.com/de/de/newsroom/new-market/',{},['www.uber.com']);assert.equal(page.publishedOn,'2026-06-01');
 const ir=parseHTML('<main><h1>Uber plans rides</h1><div class="module-news-details__date">June 17, 2026</div>'+body+'</main>','https://investor.uber.com/news-events/news/press-release-details/2026/new/default.aspx',{},['investor.uber.com']);assert.equal(ir.publishedOn,'2026-06-17');
});
test('Public commercial pilots can be announced while closed tests remain for review',()=>{
 const p=article(['Uber and WeRide plan to launch a commercial robotaxi pilot in Madrid in 2027.']);
 const result=analyzePage('Uber',p,cities,today);assert.equal(result.records[0].cityKey,'madrid');assert.equal(result.records[0].status,'announced');assert.equal(result.records[0].target.label,'2027');
 const closed=analyzePage('Uber',article(['Uber and WeRide plan to launch a closed robotaxi pilot in Madrid for employees in 2027.']),cities,today);assert.equal(closed.records.length,0);assert.ok(closed.issues.length);
});
test('Unknown places become explicit review findings and never inherit a headline city',()=>{
 const result=analyzePage('Uber',article(['Uber and WeRide plan to launch public robotaxi rides in Exampleville in 2027.'],{title:'Uber and WeRide expand from London'}),cities,today);
 assert.equal(result.records.length,0);assert.ok(result.issues.some(i=>i.places?.includes('Exampleville')));
});
test('A partner article needs an explicit link to the tracked platform',()=>{
 const url='https://ir.weride.ai/news-releases/news-release-details/new-city';
 const own=article(['WeRide plans to launch commercial robotaxi rides in Madrid in 2027.'],{url,title:'WeRide in Madrid'});
 assert.equal(analyzePage('Uber',own,cities,today).records.length,0);
 const linked=article(['Uber and WeRide plan to launch commercial robotaxi rides in Madrid in 2027.'],{url});assert.equal(analyzePage('Uber',linked,cities,today).records.length,1);
});
test('A past supervised trial does not downgrade a new explicitly driverless launch',()=>{
 const p=article(['Riders in Dubai can now book a WeRide fully driverless robotaxi through the Uber app.','This follows a supervised trial that began in 2025.'],{title:'Uber and WeRide start driverless rides in Dubai'});
 const r=analyzePage('Uber',p,cities,today).records[0];assert.equal(r.status,'live');assert.equal(r.driving,'driverless');
});
test('Real public passenger launch wording is recognized while future targets stay planned',()=>{
 const p=article(['Uber and WeRide have begun offering autonomous passenger rides in Riyadh, publicly available through the Uber app.']);
 assert.equal(analyzePage('Uber',p,cities,today).records[0].status,'live');
 const future=article(['Uber and WeRide plan to launch commercial robotaxi rides in Zurich in 2027.']);assert.equal(analyzePage('Uber',future,cities,today).records[0].status,'announced');
});
test('Alternative quarters and mid-year precision remain ranges',()=>{
 assert.equal(extractTargets('Q4 2026 or Q1 2027',today).length,1);
 assert.equal(extractTargets('Q4 2026 or Q1 2027',today)[0].target.end,'2027-03-31');
 assert.equal(extractTargets('mid-2027',today)[0].target.label,'Mitte 2027');
});
test('Feed articles enter the real crawler and blocked sources do not erase baseline records',async t=>{
 const host='www.uber.com',url='https://www.uber.com/gb/en/newsroom/new-city/';
 t.mock.method(globalThis,'fetch',async raw=>{
  if(String(raw).endsWith('index'))return new Response('<html><head><link rel="alternate" type="application/rss+xml" href="https://www.uber.com/news.rss"></head><body><main>'+('Official news index. '.repeat(15))+'</main></body></html>',{headers:{'content-type':'text/html'}});
  if(String(raw).endsWith('.rss'))return new Response(`<rss><channel><item><title>Robotaxi rides</title><link>${url}</link><pubDate>Thu, 24 Sep 2026 08:00:00 GMT</pubDate></item></channel></rss>`,{headers:{'content-type':'application/xml'}});
  return new Response('<main><h1>Uber and WeRide prepare Madrid</h1><p>Uber and WeRide plan to launch commercial robotaxi rides in Madrid in 2027. This plan will require further testing and approvals before customers can ride.</p></main>',{headers:{'content-type':'text/html'}});
 });
 const result=await crawlProvider({hosts:[host],pages:[{url:'https://www.uber.com/index',kind:'index'}]},{provider:'Uber',today,pauseMs:0});
 assert.equal(result.pages.length,2);assert.equal(result.pages[1].publishedOn,today);assert.equal(result.backlog,0);
 assert.equal(analyzePage('Uber',result.pages[1],cities,today).records[0].cityKey,'madrid');
});
