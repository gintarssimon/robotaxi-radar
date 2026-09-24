import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SOURCES} from './lib/sources.mjs';
import {crawlProvider,PARSER_VERSION} from './lib/crawl.mjs';
import {mergeRecords} from './lib/core.mjs';
import {parseAvailability} from './lib/free-rules.mjs';
import {parseAnnouncements} from './lib/announcements.mjs';
import {parseLaunches} from './lib/launches.mjs';
const readJSON=async(path,fallback)=>{try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT'&&fallback!==undefined)return fallback;throw e;}};
const snapshot=await readJSON('public/data/snapshot.json');
const cities=await readJSON('public/data/cities.json');
const state=await readJSON('.radar/source-state.json',{});
const today=new Date().toISOString().slice(0,10),run={at:new Date().toISOString(),status:'ok',providers:{},changed:0};
let records=snapshot.records;
const queue=new Map((snapshot.reviewQueue||[]).map(item=>[item.id,item]));
for(const [provider,config]of Object.entries(SOURCES)){
  const report={pages:0,accepted:0,announcements:0,launches:0,pendingReview:0,ignored:0,rejected:0,errors:[]};
  try{
    const knownURLs=[...records.filter(r=>r.provider===provider).flatMap(r=>[r.source.url,...(r.additionalSources||[]).map(s=>s.url)]),...[...queue.values()].filter(r=>r.provider===provider).map(r=>r.url)];
    const {pages,errors,discovered}=await crawlProvider(config,{state,provider,today,knownURLs});
    report.pages=pages.length;report.errors=errors;report.discovered=discovered;
    for(const page of pages){
      let issues=[],recognized=0;
      try{
        const news=parseAnnouncements(provider,page,cities,today),launches=parseLaunches(provider,page,cities,today);
        issues=[...news.issues.filter(i=>!launches.records.length||i.reason!=='Keine eindeutige Ankündigung eines künftigen öffentlichen Fahrdienstes erkannt.'),...launches.issues];recognized=news.records.length+launches.records.length;
        const candidates=[...parseAvailability(provider,page,cities,today),...news.records,...launches.records];
        const merged=mergeRecords(records,candidates,today);records=merged.records;run.changed+=merged.changed;
        report.accepted+=candidates.length;report.announcements+=news.records.length;report.launches+=launches.records.length;report.ignored+=merged.ignored;
      }catch(e){report.errors.push({url:page.url,reason:e.message});issues.push({reason:e.message});}
      const key=provider+'|'+page.url,hash=createHash('sha256').update(page.text).digest('hex'),id=createHash('sha256').update(key).digest('hex').slice(0,20);
      if(recognized&&!issues.length)queue.delete(id);
      else if(page.isArticle&&issues.length){
        report.pendingReview++;
        const previous=queue.get(id);
        queue.set(id,{id,provider,url:page.url,title:page.title.slice(0,200),publishedOn:page.publishedOn,detectedOn:state[key]?.hash===hash&&previous?previous.detectedOn:today,reason:issues.map(i=>i.reason).join(' ').slice(0,400)});
      }
      state[key]={...state[key],hash,checkedAt:today,parserVersion:PARSER_VERSION};
    }
    if(!pages.length)report.errors.push({reason:'Keine Quelle abrufbar'});
  }catch(e){report.errors.push({reason:e.message});}
  run.providers[provider]=report;
  console.log(provider+': '+report.pages+' Seiten, '+report.announcements+' Ankündigungen, '+report.launches+' Starts, '+report.errors.length+' Fehler');
}
const reports=Object.values(run.providers);
run.status=reports.every(r=>r.pages===0)?'failed':reports.some(r=>r.errors.length)?'partial':'ok';
const result={...snapshot,mode:'free',lastRun:run,records,reviewQueue:[...queue.values()].sort((a,b)=>b.detectedOn.localeCompare(a.detectedOn)).slice(0,200)};
await mkdir('.radar',{recursive:true});
await writeFile('public/data/snapshot.json.tmp',JSON.stringify(result,null,2)+'\n');
await rename('public/data/snapshot.json.tmp','public/data/snapshot.json');
await writeFile('.radar/source-state.json',JSON.stringify(state,null,2)+'\n');
console.log(JSON.stringify({status:run.status,changed:run.changed,reviewQueue:result.reviewQueue.length,providers:run.providers},null,2));
