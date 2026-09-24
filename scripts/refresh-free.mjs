import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SOURCES} from './lib/sources.mjs';
import {crawlProvider} from './lib/crawl.mjs';
import {mergeRecords} from './lib/core.mjs';
import {parseAvailability} from './lib/free-rules.mjs';
const readJSON=async(path,fallback)=>{try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT'&&fallback!==undefined)return fallback;throw e;}};
const snapshot=await readJSON('public/data/snapshot.json');
const cities=await readJSON('public/data/cities.json');
const state=await readJSON('.radar/source-state.json',{});
const today=new Date().toISOString().slice(0,10);
const run={at:new Date().toISOString(),status:'ok',providers:{},changed:0};
let records=snapshot.records;
const queue=new Map((snapshot.reviewQueue||[]).map(item=>[item.id,item]));
for(const [provider,config]of Object.entries(SOURCES)){
  const report={pages:0,accepted:0,rejected:0,errors:[]};
  try{
    const {pages,errors}=await crawlProvider(config);report.pages=pages.length;report.errors=errors;
    for(const page of pages){
      try{const candidates=parseAvailability(provider,page,cities,today);const merged=mergeRecords(records,candidates,today);records=merged.records;run.changed+=merged.changed;report.accepted+=candidates.length;}catch(e){report.errors.push({url:page.url,reason:e.message});}
      const key=provider+'|'+page.url,hash=createHash('sha256').update(page.text).digest('hex');
      const isKnownSource=records.some(r=>r.source.url===page.url);
      if(state[key]?.hash!==hash&&(!isKnownSource||state[key])){
        const id=createHash('sha256').update(key).digest('hex').slice(0,20);
        queue.set(id,{id,provider,url:page.url,title:page.title.slice(0,200),publishedOn:page.publishedOn,detectedOn:today,reason:state[key]?'Quelleninhalt geändert · Bedeutung prüfen':'Neue Quelle entdeckt · Inhalt prüfen'});
      }
      state[key]={hash,checkedAt:today};
    }
    if(!pages.length)report.errors.push({reason:'Keine Quelle abrufbar'});
  }catch(e){report.errors.push({reason:e.message});}
  run.providers[provider]=report;
}
const reports=Object.values(run.providers);
run.status=reports.every(r=>r.pages===0)?'failed':reports.some(r=>r.errors.length)?'partial':'ok';
const result={...snapshot,mode:'free',lastRun:run,records,reviewQueue:[...queue.values()].sort((a,b)=>b.detectedOn.localeCompare(a.detectedOn)).slice(0,200)};
// All previous market records are retained if a provider changes or blocks HTML.
await mkdir('.radar',{recursive:true});
await writeFile('public/data/snapshot.json.tmp',JSON.stringify(result,null,2)+'\n');
await rename('public/data/snapshot.json.tmp','public/data/snapshot.json');
await writeFile('.radar/source-state.json',JSON.stringify(state,null,2)+'\n');
console.log(JSON.stringify({status:run.status,changed:run.changed,reviewQueue:result.reviewQueue.length,providers:run.providers},null,2));
// A partial check is still publishable so that users can see the failure.
