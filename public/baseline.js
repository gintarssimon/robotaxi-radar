import {mergeRecords} from './merge.js?v=20260924-v6';
export const RELEASE='2026-09-24.6';
export function applyBaseline(snapshot,baseline,today=new Date().toISOString().slice(0,10)) {
  if(!baseline||!Array.isArray(baseline.records))throw new Error('Geprüfter Grundbestand fehlt');
  const records=baseline.records.filter(r=>r.source?.publishedOn && r.source.publishedOn<=today);
  const merged=mergeRecords(snapshot.records||[],records,today);
  // A source remains in review if its content has subsequently changed.
  // Merely shipping a baseline must not dismiss unrelated/new findings.
  return {...snapshot,records:merged.records,baselineVersion:baseline.version,baselineAsOf:baseline.asOf};
}
