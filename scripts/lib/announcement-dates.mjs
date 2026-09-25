import {makeTarget,validDay} from './core.mjs';
const MONTHS={january:1,jan:1,januar:1,february:2,feb:2,februar:2,march:3,mar:3,'märz':3,maerz:3,april:4,apr:4,may:5,mai:5,june:6,jun:6,juni:6,july:7,jul:7,juli:7,august:8,aug:8,september:9,sept:9,sep:9,october:10,oct:10,oktober:10,okt:10,november:11,nov:11,december:12,dec:12,dezember:12,dez:12};
const months=Object.keys(MONTHS).sort((a,b)=>b.length-a.length).join('|'),pad=n=>String(n).padStart(2,'0');
const span=(y,first,last,precision,qualifier)=>makeTarget({start:y+'-'+pad(first)+'-01',end:new Date(Date.UTC(Number(y),last,0)).toISOString().slice(0,10),precision,...(qualifier?{qualifier}:{})});
const year=(y,q)=>span(y,1,12,'year',q);
const qualifier=w=>/end|late|ende/i.test(w)?'late':/early|anfang/i.test(w)?'early':/mid|mitte/i.test(w)?'mid':/spring|früh/i.test(w)?'spring':/summer|sommer/i.test(w)?'summer':/autumn|fall|herbst/i.test(w)?'autumn':'winter';
export function extractTargets(text,publishedOn){
  const found=[],consumed=[];
  const add=(regex,build)=>{for(const m of text.matchAll(regex)){
    const index=m.index,end=index+m[0].length;if(consumed.some(x=>index<x.end&&end>x.index))continue;
    consumed.push({index,end});try{const target=build(m);if(target)found.push({target,index,end,phrase:m[0]});}catch{}
  }};
  const exact=(y,m,d)=>{const s=y+'-'+pad(m)+'-'+pad(d);return validDay(s)?makeTarget({start:s,end:s,precision:'day'}):null;};
  add(/\b(20\d{2})-(\d{2})-(\d{2})\b/g,m=>exact(m[1],m[2],m[3]));
  add(new RegExp('\\b('+months+')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?[,]?\\s+(20\\d{2})\\b','gi'),m=>exact(m[3],MONTHS[m[1].toLowerCase()],m[2]));
  add(new RegExp('\\b(\\d{1,2})\\.?\\s+('+months+')\\.?\\s+(20\\d{2})\\b','gi'),m=>exact(m[3],MONTHS[m[2].toLowerCase()],m[1]));
  add(/\bQ([1-4])\s+(20\d{2})\s+(?:or|oder|to|bis)\s+Q([1-4])\s+(20\d{2})\b/gi,m=>makeTarget({start:span(m[2],Number(m[1])*3-2,Number(m[1])*3,'quarter').start,end:span(m[4],Number(m[3])*3-2,Number(m[3])*3,'quarter').end,precision:'range'}));
  add(/\b(?:Q([1-4])|([1-4])\.?\s*Quartal)\s+(20\d{2})\b/gi,m=>{const q=Number(m[1]||m[2]);return span(m[3],q*3-2,q*3,'quarter');});
  add(/\b(first|second|1\.?|2\.?)\s+(?:half(?:\s+of)?|Halbjahr)\s+(20\d{2})\b/gi,m=>/first|1/i.test(m[1])?span(m[2],1,6,'half'):span(m[2],7,12,'half'));
  add(/\b(?:towards?\s+(?:the\s+)?|at\s+the\s+|gegen\s+)?(end of|late|early|mid|Anfang|Mitte|Ende|spring|summer|autumn|fall|winter|Frühjahr|Sommer|Herbst)[\s-]+(20\d{2})\b/gi,m=>year(m[2],qualifier(m[1])));
  add(new RegExp('\\b('+months+')\\.?\\s+(20\\d{2})\\b','gi'),m=>span(m[2],MONTHS[m[1].toLowerCase()],MONTHS[m[1].toLowerCase()],'month'));
  if(validDay(publishedOn)){const y=Number(publishedOn.slice(0,4));add(/\b(?:(early|late|mid|end of|Anfang|Mitte|Ende)\s+)?(next year|this year|nächstes Jahr|nächsten Jahres|dieses Jahr|dieses Jahres)\b/gi,m=>year(y+(/next|nächst/i.test(m[2])?1:0),m[1]?qualifier(m[1]):undefined));}
  add(/\b(20\d{2})\b/g,m=>year(m[1]));
  return found.sort((a,b)=>a.index-b.index);
}
