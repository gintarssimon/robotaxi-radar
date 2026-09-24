import { load } from 'cheerio';
import { canonicalURL, validDay } from './core.mjs';
const MAX_BYTES=2000000;
async function boundedHTML(url,hosts,redirects=0){
  url=canonicalURL(url,hosts);
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(18000),headers:{'User-Agent':'RobotaxiRadar/0.1 (official public source monitor)','Accept':'text/html'}});
  if(response.status>=300&&response.status<400){if(redirects>=3)throw new Error('Zu viele Weiterleitungen');return boundedHTML(new URL(response.headers.get('location'),url).href,hosts,redirects+1);}
  if(!response.ok)throw new Error(`Quellenabruf HTTP ${response.status}`);
  if(!response.headers.get('content-type')?.includes('text/html'))throw new Error('Kein HTML');
  const reader=response.body.getReader();let size=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES){await reader.cancel();throw new Error('Seite zu groß');}chunks.push(value);}
  return {url,html:Buffer.concat(chunks).toString('utf8')};
}
export async function getPage(spec,hosts){
  const {url,html}=await boundedHTML(spec.url,hosts);
  const $=load(html);
  const title=$('h1').first().text().trim()||$('title').text().trim()||new URL(url).hostname;
  const candidates=[$('meta[property="article:published_time"]').attr('content'),$('meta[name="date"]').attr('content'),$('time[datetime]').first().attr('datetime')];
  $('script[type="application/ld+json"]').each((_,el)=>{try{const scan=o=>{if(!o||typeof o!=='object')return;if(o.datePublished)candidates.push(o.datePublished);if(Array.isArray(o))o.forEach(scan);else if(o['@graph'])scan(o['@graph']);};scan(JSON.parse($(el).text()));}catch{}});
  const bodyDate=$('body').text().match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+20\d{2}\b/);
  if(bodyDate && Number.isFinite(Date.parse(bodyDate[0])))candidates.push(new Date(bodyDate[0]).toISOString());
  const publishedOn=candidates.map(x=>String(x||'').slice(0,10)).find(validDay)||null;
  const links=[];
  $('a[href]').each((_,el)=>{const a=$(el);try{const href=canonicalURL(new URL(a.attr('href'),url).href,hosts);if(/robotaxi|autonom|driverless|waymo|weride|baidu|avride|may mobility/i.test(a.text()+' '+href)&&/blog\/|newsroom\/|press-release|support\/robotaxi/i.test(href)&&href!==url)links.push({url:href,dynamic:false});}catch{}});
  $('script,style,nav,footer,header,noscript,svg,form').remove();
  const content=$('article').length?$('article').first():$('main').length?$('main').first():$('body');
  const text=content.text().replace(/\s+/g,' ').trim().slice(0,22000);
  if(text.length<150)throw new Error('Quelle leer oder nur Ladegerüst');
  return {url,title,publishedOn,dynamic:spec.dynamic===true,text,links};
}
export async function crawlProvider(config){
  const pages=[],errors=[];
  for(const spec of config.pages){try{pages.push(await getPage(spec,config.hosts));}catch(e){errors.push({url:spec.url,reason:e.message});}}
  const seen=new Set(pages.map(p=>p.url));
  const links=pages.flatMap(p=>p.links).filter(p=>{if(seen.has(p.url))return false;seen.add(p.url);return true;});
  // Recent newsrooms usually list newest first. Bounded crawl: at most 3 extra pages.
  for(const spec of links.slice(0,3)){try{pages.push(await getPage(spec,config.hosts));}catch(e){errors.push({url:spec.url,reason:e.message});}}
  return {pages:pages.map(({links,...p})=>p),errors};
}
