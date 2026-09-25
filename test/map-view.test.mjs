import test from 'node:test';
import assert from 'node:assert/strict';
import {clusterCities} from '../public/map-view.js';

const cities={london:{lat:51.5,lng:-.12},nearby:{lat:51.55,lng:-.17},tokyo:{lat:35.7,lng:139.7}};
const groups=new Map([
  ['london',[{provider:'Uber'},{provider:'Lyft'},{provider:'Waymo'}]],
  ['nearby',[{provider:'Waymo'}]],
  ['tokyo',[{provider:'Uber'}]]
]);
const project=([lat,lng])=>({x:lng*5,y:lat*5});

test('Clusters count cities and retain every provider entry in mixed cities',()=>{
  const result=clusterCities(groups,cities,project,3);
  assert.equal(result.length,2);
  assert.equal(result[0].items.length,2);
  assert.equal(result.flatMap(c=>c.items).length,3);
  assert.equal(result.flatMap(c=>c.items.flatMap(i=>i.records)).length,5);
  assert.equal(groups.get('london').length,3);
});

test('City zoom separates nearby locations while keeping multiple London providers together',()=>{
  const result=clusterCities(groups,cities,project,12);
  assert.equal(result.length,3);
  assert.equal(result.find(c=>c.items[0].key==='london').items[0].records.length,3);
});

test('Empty filters leave no city markers and a single city needs no cluster',()=>{
  assert.deepEqual(clusterCities(new Map(),cities,project,2),[]);
  const result=clusterCities(new Map([['london',groups.get('london')]]),cities,project,2);
  assert.equal(result.length,1);
  assert.equal(result[0].items.length,1);
});
