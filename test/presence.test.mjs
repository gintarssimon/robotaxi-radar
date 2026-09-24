import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAvailability} from '../scripts/lib/free-rules.mjs';
import {mergeRecords} from '../scripts/lib/core.mjs';
import {rankRecords,filterRecords,isDrivingStale} from '../public/model.js';
const today='2026-09-24',now=new Date(today+'T12:00:00Z');
const cities={austin:{name:'Austin',region:'Nordamerika'},atlanta:{name:'Atlanta',region:'Nordamerika'},dallas:{name:'Dallas'},nashville:{name:'Nashville'},london:{name:'London'}};
const source={url:'https://waymo.com/rides/',title:'Waymo service',dynamic:true,checkedAt:today,publishedOn:null};
const row={id:'waymo-austin-waymo',provider:'Waymo',operator:'Waymo',platform:'Uber',cityKey:'austin',status:'live',driving:'driverless',source,history:[]};
const cityList='Serving Riders In Austin, TX Ride on Uber Atlanta, GA Ride on Uber Up Next London, UK Sign up for updates';

test('Screenshot regression: active Waymo cities do not become zero when driving mode is unknown',()=>{
  const rows=[{...row,driving:'unknown'},{...row,id:'atlanta',cityKey:'atlanta',driving:'unknown'},{...row,id:'lyft',provider:'Lyft',cityKey:'nashville'}];
  const ranking=rankRecords(rows,now);
  assert.equal(ranking[0].provider,'Waymo');assert.equal(ranking[0].count,2);assert.equal(ranking[0].uncertain,2);
});
test('Waymo rides page joins a current service description with the live city list',()=>{
  const description='Our fully autonomous ride-hailing service is available to the public.';
  const page={url:source.url,title:'Waymo',text:description+' '+cityList,blocks:[description,cityList]};
  const waymo=parseAvailability('Waymo',page,cities,today),uber=parseAvailability('Uber',page,cities,today);
  assert.equal(waymo.filter(r=>r.status==='live'&&r.driving==='driverless').length,2);
  assert.equal(waymo.find(r=>r.cityKey==='london').driving,'unknown');
  assert.equal(uber.length,2);assert.ok(uber.every(r=>r.operator==='Waymo'&&r.drivingSource.url===source.url));
});
test('Future or negated service descriptions never establish driverless operations',()=>{
  for(const text of ['We will offer a fully autonomous service.','This is not a driverless service.']){
    const rows=parseAvailability('Waymo',{url:source.url,title:'Waymo',text:text+' '+cityList,blocks:[text,cityList]},cities,today);
    assert.ok(rows.every(r=>r.driving==='unknown'));
  }
});
test('An availability-only refresh preserves the original driving evidence and its age',()=>{
  const old={...row,source:{...source,checkedAt:'2026-08-01'}};
  const incoming={...row,driving:'unknown',source:{...source,url:'https://waymo.com/'},extraction:'availability'};
  const next=mergeRecords([old],[incoming],today).records[0];
  assert.equal(next.driving,'driverless');assert.equal(next.source.checkedAt,today);
  assert.equal(next.drivingSource.checkedAt,'2026-08-01');assert.equal(isDrivingStale(next,now),true);
  const rank=rankRecords([next],now).find(r=>r.provider==='Waymo');
  assert.equal(rank.count,1);assert.equal(rank.driverless,0);assert.equal(rank.uncertain,1);
});
test('A newer explicit supervision observation replaces older driverless evidence',()=>{
  const old={...row,source:{...source,checkedAt:'2026-09-23'}};
  const next=mergeRecords([old],[{...row,driving:'supervised'}],today).records[0];
  assert.equal(next.driving,'supervised');assert.equal(next.drivingSource.checkedAt,today);
});
test('A fresh driving-mode confirmation repairs records already damaged by the old parser',()=>{
  const old={...row,driving:'unknown'};const next=mergeRecords([old],[row],today).records[0];
  assert.equal(next.driving,'driverless');assert.equal(rankRecords([next],now)[0].driverless,1);
});
test('Operating totals include limited access once and exclude tests, plans and pauses',()=>{
  const rows=[row,{...row,id:'dup',status:'limited'},{...row,id:'second',cityKey:'atlanta',status:'limited'},...['testing','announced','paused'].map((status,i)=>({...row,id:status,cityKey:'other'+i,status}))];
  const rank=rankRecords(rows,now)[0];assert.equal(rank.count,2);assert.equal(rank.limited,1);
  const selected=filterRecords(rows,{providers:['Waymo'],region:'all',status:'operating',search:''},cities);
  assert.equal(new Set(selected.map(r=>r.cityKey)).size,rank.count);
});
test('An older service record remains visible, with an explicit age warning',()=>{
  const old={...row,source:{...source,checkedAt:'2025-01-01'}};const rank=rankRecords([old],now)[0];
  assert.equal(rank.count,1);assert.equal(rank.stale,1);assert.equal(rank.driverless,0);
});
test('A future city list never silently downgrades a known live service',()=>{
  const candidate={...row,status:'announced',driving:'unknown',extraction:'availability'};
  assert.equal(mergeRecords([row],[candidate],today).records[0].status,'live');
});
test('Uber city pages require matching partner, city and present availability',()=>{
  const blocks=['Uber has partnered with Avride to make autonomous rides available through the Uber app in Dallas.','An onboard specialist sits behind the wheel.'];
  const page={url:'https://www.uber.com/us/en/r/autonomous/dallas-tx-us/',title:'Avride robotaxis in Dallas',text:blocks.join(' '),blocks};
  const rows=parseAvailability('Uber',page,cities,today);
  assert.equal(rows.length,1);assert.equal(rows[0].cityKey,'dallas');assert.equal(rows[0].operator,'Avride');assert.equal(rows[0].driving,'supervised');
  assert.throws(()=>parseAvailability('Uber',{...page,blocks:['Uber plans to make rides available in Dallas.']},cities,today));
  assert.throws(()=>parseAvailability('Uber',{...page,title:'Autonomous rides in Dallas'},cities,today));
});
test('Lyft partner service distinguishes public pilots from driverless rides',()=>{
  const waymo={url:'https://www.lyft.com/autonomous/waymo',title:'Lyft and Waymo',text:'Waymo rides are now available on Lyft in Nashville. Fully autonomous vehicles.',blocks:['Waymo rides are now available on Lyft in Nashville.','Fully autonomous vehicles.']};
  const may={url:'https://www.lyft.com/autonomous/maymobility',title:'Lyft and May Mobility',text:'May Mobility. Autonomous rides are now available in Atlanta. During our pilot program.',blocks:['Autonomous rides are now available in Atlanta.','An onboard operator sits behind the wheel.']};
  assert.equal(parseAvailability('Lyft',waymo,cities,today)[0].driving,'driverless');
  const pilot=parseAvailability('Lyft',may,cities,today)[0];assert.equal(pilot.status,'limited');assert.equal(pilot.driving,'supervised');
});
test('Availability parser refuses lookalike hosts',()=>{
  const page={url:'https://fake.test/support/robotaxi',title:'Tesla',text:'Currently, we provide service in limited areas of Austin.'};
  assert.deepEqual(parseAvailability('Tesla',page,cities,today),[]);
});
