export function evidenceDay(r) { return r.source.dynamic ? r.source.checkedAt : r.source.publishedOn || '0000-00-00'; }
export function mergeRecords(existing, candidates, today) {
  const records = new Map(existing.map(r=>[r.id,r]));
  let changed=0, ignored=0;
  for(const candidate of candidates.sort((a,b)=>evidenceDay(a).localeCompare(evidenceDay(b)))) {
    const prev=records.get(candidate.id);
    if(prev&&['announced','preparation','testing'].includes(candidate.status)&&['live','limited','paused'].includes(prev.status)){ignored++;continue;}
    if(prev && (evidenceDay(candidate)<evidenceDay(prev) || evidenceDay(candidate)===evidenceDay(prev)&&prev.review==='source-checked'&&candidate.review!=='source-checked')){
      // Older launch articles may fill missing historical dates without changing
      // the newer availability status. A target retains its own dated evidence.
      if(candidate.status===prev.status){
        const enriched={...prev};let amended=false;
        for(const key of ['announcedOn','launchedOn'])if(!prev[key]&&candidate[key]){enriched[key]=candidate[key];amended=true;}
        if(candidate.target&&(!prev.target || evidenceDay(candidate)>(prev.targetSource?.publishedOn||'9999'))){enriched.target=candidate.target;enriched.targetSource=candidate.source;amended=true;}
        if(amended){enriched.additionalSources=[...(prev.additionalSources||[]),candidate.source].filter((s,i,a)=>a.findIndex(x=>x.url===s.url)===i).slice(-5);enriched.review='automatic';records.set(prev.id,enriched);changed++;continue;}
      }
      ignored++;continue;
    }
    // Do not let an undated aggregate page erase historically evidenced dates.
    const next=prev ? {...candidate,announcedOn:candidate.announcedOn||prev.announcedOn,launchedOn:candidate.launchedOn||prev.launchedOn,target:candidate.target||prev.target,targetSource:candidate.target?candidate.source:prev.targetSource||null,additionalSources:prev.additionalSources||[]} : {...candidate,targetSource:candidate.target?candidate.source:null,additionalSources:candidate.additionalSources||[]};
    // A source that says nothing about onboard personnel does not contradict an
    // existing observation. Preserve that observation with its ORIGINAL source
    // date, so a fresh availability check cannot silently renew old evidence.
    if(candidate.driving==='unknown' && prev && prev.driving!=='unknown' && candidate.operator===prev.operator && ['live','limited'].includes(candidate.status) && ['live','limited'].includes(prev.status)){
      next.driving=prev.driving;
      next.drivingSource=prev.drivingSource||prev.source;
    }else{
      next.drivingSource=candidate.driving!=='unknown'?(candidate.drivingSource||candidate.source):null;
    }
    if(next.drivingSource&&next.drivingSource.url!==next.source.url)next.additionalSources=[...(next.additionalSources||[]),next.drivingSource].filter((s,i,a)=>a.findIndex(x=>x.url===s.url)===i).slice(-5);
    if(prev?.target && !candidate.target) next.additionalSources=[...(next.additionalSources||[]),prev.source].filter((s,i,a)=>a.findIndex(x=>x.url===s.url)===i).slice(-5);
    const substantive= !prev || ['status','driving','platform','launchedOn','announcedOn','target'].some(k=>JSON.stringify(prev[k])!==JSON.stringify(next[k]));
    // Preserve human review only when the record and its source are unchanged.
    if(prev && !substantive && prev.source.url===next.source.url && prev.notes===next.notes) next.review=prev.review;
    next.history=prev?.history||[];
    if(substantive && prev) next.history=[...next.history,{at:today,status:prev.status,driving:prev.driving,target:prev.target,sourceURL:prev.source.url}].slice(-12);
    if(substantive) changed++;
    records.set(next.id,next);
  }
  // Missing observations never delete or automatically pause a service.
  return {records:[...records.values()],changed,ignored};
}
