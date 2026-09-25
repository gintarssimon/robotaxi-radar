import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from '../scripts/lib/crawl.mjs';
import {parseLaunches} from '../scripts/lib/launches.mjs';
import {parseAnnouncements} from '../scripts/lib/announcements.mjs';
import {mergeRecords} from '../scripts/lib/core.mjs';
import {rankRecords} from '../public/model.js';
const today='2026-09-24',cities={london:{name:'London'},tokyo:{name:'Tokio',aliases:['Tokyo']},berlin:{name:'Berlin'}};
const base={url:'https://www.uber.com/gb/en/newsroom/new-service/',title:'Uber and Wayve open a new service',publishedOn:'2026-09-02',dynamic:false,isArticle:true};
const make=(body,changes={})=>({...base,text:body,blocks:[body],...changes});
const body='Uber and Wayve today launched supervised autonomous rides in London, with trips available to the public.';
test('Uber UK headline byline supplies publication date without scraping body dates',()=>{
  const html='<html><body><main><div><div data-baseweb="typo-labellarge">September 2, 2026</div><div><h1>Uber and Wayve launch rides</h1></div></div><p>'+body+'</p><p>We also plan a service in Tokyo in 2028. This future expansion is only an announcement.</p></main></body></html>';
  const page=parseHTML(html,base.url,{},['www.uber.com']);assert.equal(page.publishedOn,'2026-09-02');
  const without=html.replace('<div data-baseweb="typo-labellarge">September 2, 2026</div>','');
  assert.equal(parseHTML(without,base.url,{},['www.uber.com']).publishedOn,null);
});
test('London public launch is supervised operating service, not a driverless announcement',()=>{
  const result=parseLaunches('Uber',make(body),cities,today);assert.equal(result.records.length,1);
  const r=result.records[0];assert.equal(r.cityKey,'london');assert.equal(r.operator,'Wayve');assert.equal(r.status,'live');assert.equal(r.driving,'supervised');assert.equal(r.launchedOn,null);assert.equal(r.source.publishedOn,'2026-09-02');
  const rank=rankRecords([r],new Date(today))[0];assert.equal(rank.count,1);assert.equal(rank.driverless,0);assert.equal(rank.supervised,1);
});
test('The same launch rule works for another city and publisher URL',()=>{
  const r=parseLaunches('Uber',make(body.replace('London','Berlin'),{url:'https://www.uber.com/de/en/newsroom/new-service/'}),cities,today).records[0];assert.equal(r.cityKey,'berlin');
});
test('Future and hypothetical launches, office openings and closed trials are not public service',()=>{
  for(const text of ['Uber and Wayve will launch autonomous rides in London for the public.','If Uber and Wayve today launched autonomous rides in London, trips would be available to the public.','Uber and Wayve today launched a London office for autonomous rides.','Uber and Wayve today launched autonomous rides in London for employees.','Uber and Wayve have not launched autonomous rides in London, with trips available to the public.'])assert.equal(parseLaunches('Uber',make(text),cities,today).records.length,0);
});
test('Tokyo future expansion in the same article never becomes live',()=>{
  const p=make(body+' Wayve will launch public ride-hailing in Tokyo in 2027.');
  const launched=parseLaunches('Uber',p,cities,today);assert.deepEqual(launched.records.map(r=>r.cityKey),['london']);
  const plans=parseAnnouncements('Uber',p,cities,today);assert.equal(plans.records.find(r=>r.cityKey==='tokyo').status,'announced');
});
test('Missing date, future publication and third-party hosts fail closed',()=>{
  for(const changes of [{publishedOn:null},{publishedOn:'2027-01-01'},{url:'https://example.com/newsroom/new-service/'},{dynamic:true}])assert.equal(parseLaunches('Uber',make(body,changes),cities,today).records.length,0);
});
test('Distinct partners in London are separate records; one city is counted once',()=>{
  const launched=parseLaunches('Uber',make(body),cities,today).records[0];
  const planned={...launched,id:'uber-london-baidu-apollo-go',operator:'Baidu Apollo Go',status:'announced',driving:'unknown'};
  assert.equal(mergeRecords([planned],[launched],today).records.length,2);
  assert.equal(rankRecords([planned,launched],new Date(today))[0].count,1);
});
test('A newer actual launch replaces an announcement while older launches cannot revive a pause',()=>{
  const launched=parseLaunches('Uber',make(body),cities,today).records[0];
  const planned={...launched,status:'announced',source:{...launched.source,publishedOn:'2025-06-10'}};
  assert.equal(mergeRecords([planned],[launched],today).records[0].status,'live');
  const paused={...launched,status:'paused',source:{...launched.source,publishedOn:'2026-09-20'}};
  assert.equal(mergeRecords([paused],[launched],today).records[0].status,'paused');
});
