import {load} from 'cheerio';
import {canonicalURL,validDay} from './core.mjs';
export const PARSER_VERSION=6;
const compact=s=>String(s||'').replace(/\s+/g,' ').trim();
function textOf(selection){
  const parts=[];
  const visit=n=>{if(n.type==='text')parts.push(n.data);else for(const child of n.children||[])visit(child);};
  for(const n of selection.toArray())visit(n);
  return compact(parts.join(' '));
}
async function documentAt(raw,hosts,xml=false,redirects=0){
  const url=canonicalURL(raw,hosts);
  const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'User-Agent':'RobotaxiRadar/0.3 (official public source monitor)','Accept':xml?'application/xml,text/xml':'text/html'}});
  if(r.status>=300&&r.status<400){
    const location=r.headers.get('location');
    if(redirects>=3||!location)throw new Error('Ungültige oder zu viele Weiterleitungen');
    return documentAt(new URL(location,url).href,hosts,xml,redirects+1);
  }
  if(!r.ok){const e=new Error('Quellenabruf HTTP '+r.status);e.status=r.status;e.host=new URL(url).hostname;throw e;}
  const type=r.headers.get('content-type')||'';
  if(!(xml?/xml|text\/plain/.test(type):type.includes('text/html')))throw new Error(xml?'Kein XML':'Kein HTML');
  const reader=r.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000){await reader.cancel();throw new Error('Seite zu groß');}chunks.push(value);}
  return {url,html:Buffer.concat(chunks).toString('utf8')};
}
export function isNewsArticleURL(raw){
  try{const p=new URL(raw).pathname;return /\/blog\/20\d{2}\/\d{2}\/[^/]+\/?$/.test(p)||/\/blog\/posts\/[^/]+\/?$/.test(p)||/\/newsroom\/(?!page\/|category\/|media-assets|contact|leadership|autonomous\/?$|company-news\/?$|rides\/?$)[^/]+\/?$/.test(p)||/\/press-release-details\/20\d{2}\//.test(p)||/\/news-release-details\/[^/]+/.test(p)||/\/press-releases\/detail\//.test(p)||/\/press\/[^/]+\/?$/.test(p)||/\/news\/(?!page\/)[^/]+\/?$/.test(p)&&!p.endsWith('default.aspx')||/\/Archives\/edgar\/.+\.htm$/.test(p)||/\/blog\/[^/]+\/?$/.test(p)&&!/(category|tag|archive|search)/.test(p);}catch{return false;}
}
function parseByline(text){
  const normalized=compact(text).replace(/^(?:[\w .,-]+\s+[–—-]\s+)(?=[A-Z][a-z]{2} \d)/,'');
  const english=normalized.match(/^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.? (\d{1,2}),? (20\d{2})$/i);
  if(english){const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(english[1].slice(0,3).toLowerCase())+1;const day=`${english[3]}-${String(month).padStart(2,'0')}-${english[2].padStart(2,'0')}`;if(validDay(day))return day;}
  const m=normalized.match(/^(\d{1,2})\.\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(20\d{2})$/i);
  if(m){const month=['januar','februar','märz','april','mai','juni','juli','august','september','oktober','november','dezember'].indexOf(m[2].toLowerCase())+1;const day=`${m[3]}-${String(month).padStart(2,'0')}-${m[1].padStart(2,'0')}`;if(validDay(day))return day;}
  return validDay(normalized)?normalized:null;
}
function publicationDay($,article,url){
  const values=[$('meta[property="article:published_time"]').attr('content'),$('meta[name="date"]').attr('content'),article.find('time[datetime]').first().attr('datetime')];
  $('script[type="application/ld+json"]').each((_,el)=>{
    try{const scan=o=>{if(!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(scan);return;}if(/Article|BlogPosting/.test(String(o['@type'])))values.push(o.datePublished);if(o['@graph'])scan(o['@graph']);};scan(JSON.parse($(el).text()));}catch{}
  });
  // Uber's newsroom prints its date immediately before the headline without
  // time/date attributes. Only accept an isolated byline before that heading;
  // dates in article text and related articles are never publication dates.
  if(/^(www\.)?uber\.com$/.test(new URL(url).hostname)&&new URL(url).pathname.includes('/newsroom/')){
    const heading=$('h1').first();
    heading.add(heading.parents().slice(0,3)).each((_,el)=>{
      const label=textOf($(el).prev());
      values.push(parseByline(label));
    });
  }
  // Publication metadata only: launch dates in article paragraphs are not bylines.
  article.find('time,[aria-label="Article information"],[class*="Date"],[class*="date"],[itemprop="datePublished"]').slice(0,12).each((_,el)=>{
    const text=textOf($(el));values.push(parseByline(text));
    const m=text.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+20\d{2}\b/i);
    if(m)values.push(parseByline(m[0]));
    const iso=text.match(/\b20\d{2}-\d{2}-\d{2}\b/);if(iso)values.push(iso[0]);
  });
  return values.map(v=>String(v||'').slice(0,10)).find(validDay)||null;
}
export function parseHTML(html,url,spec,hosts){
  const $=load(html),article=$('article').length===1?$('article').first():$('main').length?$('main').first():$('body');
  const title=textOf($('h1').first())||$('meta[property="og:title"]').attr('content')||textOf($('title'))||new URL(url).hostname;
  const isArticle=spec.kind!=='index'&&!spec.dynamic&&isNewsArticleURL(url);
  const publishedOn=isArticle?publicationDay($,article,url)||(validDay(spec.publishedOn)?spec.publishedOn:null):null,links=[],feeds=[];
  $('link[rel="alternate"][href],a[href]').each((_,el)=>{try{const href=canonicalURL(new URL($(el).attr('href'),url).href,hosts);if(/rss|atom/i.test($(el).attr('type')||'')||/rss|\.xml(?:\?|$)/i.test(href)&&/feed|rss/i.test(href))feeds.push(href);}catch{}});
  $('a[href]').each((_,el)=>{
    try{const a=$(el),href=canonicalURL(new URL(a.attr('href'),url).href,hosts);if(isNewsArticleURL(href)&&href!==url)links.push({url:href,titleHint:textOf(a).slice(0,200),dynamic:false});}catch{}
  });
  $('script,style,nav,footer,noscript,svg,form,aside,[aria-label="Related articles"],[class*="relatedPosts"],[class*="RelatedArticles"],[class*="related-articles"]').remove();
  if(isArticle)article.find('button').remove();
  const content=isArticle?article:$('main').length?$('main').first():$('body'),blocks=[];
  let ended=false;
  content.find('p,li,h2,h3').each((_,el)=>{const e=$(el);if(ended||e.find('p,li').length||e.closest('blockquote').length)return;const text=textOf(e);if(isArticle&&/^(?:Related articles|About (?:Uber|WeRide|Lyft|Waymo|Tesla|Baidu|Nuro|Lucid|MOIA|Rivian|Verne|Pony)|Forward[- ]Looking Statements|Safe Harbor Statement)\b/i.test(text)){ended=true;return;}if(text.length>20&&text.length<3500)blocks.push(text);});
  const text=textOf(content).slice(0,30000);
  if(text.length<150)throw new Error('Quelle leer oder nur Ladegerüst');
  return {url,title:compact(title),publishedOn,dynamic:spec.dynamic===true,isArticle,text,blocks:blocks.slice(0,100),links,feeds:[...new Set(feeds)].slice(0,3)};
}
export async function getPage(spec,hosts){const {url,html}=await documentAt(spec.url,hosts);return parseHTML(html,url,spec,hosts);}
export function sitemapLinks(xml,hosts,today){
  const $=load(xml,{xmlMode:true}),links=[];
  $('url').each((_,el)=>{try{
    const url=canonicalURL($(el).find('loc').first().text(),hosts);if(!isNewsArticleURL(url))return;
    const dated=new URL(url).pathname.match(/\/(20\d{2})\/(\d{2})\//);
    if(dated&&(Number(dated[1])<Number(today.slice(0,4))-1||dated[1]+'-'+dated[2]>today.slice(0,7)))return;
    links.push({url,dynamic:false,titleHint:''});
  }catch{}});
  return links;
}
export function feedLinks(xml,hosts){
  const $=load(xml,{xmlMode:true}),links=[];
  $('item,entry').each((_,el)=>{try{
    const entry=$(el),raw=entry.find('link[rel="alternate"]').attr('href')||entry.find('link').first().attr('href')||entry.find('link').first().text();
    const url=canonicalURL(raw,hosts);if(!isNewsArticleURL(url))return;
    const value=entry.find('pubDate,published').first().text();
    const publishedOn=Number.isFinite(Date.parse(value))?new Date(Date.parse(value)).toISOString().slice(0,10):null;
    links.push({url,titleHint:compact(entry.find('title').first().text()),publishedOn,dynamic:false});
  }catch{}});
  return links;
}
const saved=(state,provider,url)=>state[provider+'|'+url]||state[provider+'|'+url.replace(/\/$/,'')]||state[provider+'|'+url.replace(/\/$/,'')+'/']||{};
export function chooseArticles(links,state,provider,today,limit=8){
  const unique=new Map();
  for(const link of links){const key=link.url.replace(/\/$/,''),prev=unique.get(key);unique.set(key,{...prev,...link,watch:link.watch||prev?.watch,titleHint:link.titleHint||prev?.titleHint||''});}
  const score=p=>{const s=saved(state,provider,p.url);return (p.watch?1000:0)+(!s.checkedAt?100:0)+(/coming|launch|robotaxi|expan|waymo-in-|autonom|driverless|ride-hailing/i.test(new URL(p.url).pathname+' '+p.titleHint)?30:0);};
  return [...unique.values()].filter(p=>{const s=saved(state,provider,p.url);if(s.lastAttempt===today&&s.attemptVersion===PARSER_VERSION)return false;if(s.parserVersion!==PARSER_VERSION)return true;return !s.checkedAt||(Date.parse(today)-Date.parse(s.checkedAt))/86400000>=7;})
    .sort((a,b)=>score(b)-score(a)||(saved(state,provider,a.url).lastAttempt||'').localeCompare(saved(state,provider,b.url).lastAttempt||'')||b.url.localeCompare(a.url)).slice(0,limit);
}
export async function crawlProvider(config,{state={},provider='',today=new Date().toISOString().slice(0,10),knownURLs=[],pauseMs=700}={}){
  const pages=[],errors=[],blocked=new Set(),links=[],feeds=new Set(config.feeds||[]);let requests=0;
  const attempt=async(spec,xml=false)=>{
    const host=new URL(spec.url).hostname;if(blocked.has(host))return null;
    if(requests++&&pauseMs)await new Promise(resolve=>setTimeout(resolve,pauseMs));
    const key=provider+'|'+spec.url;if(!xml)state[key]={...state[key],lastAttempt:today,attemptVersion:PARSER_VERSION};
    try{return xml?(await documentAt(spec.url,config.hosts,true)).html:await getPage(spec,config.hosts);}
    catch(e){errors.push({url:spec.url,reason:e.message});if([403,429].includes(e.status))blocked.add(e.host||host);return null;}
  };
  for(const spec of config.pages){const p=await attempt(spec);if(p){pages.push(p);links.push(...p.links);for(const feed of p.feeds||[])feeds.add(feed);}}
  for(const url of [...feeds].slice(0,6)){const xml=await attempt({url},true);if(xml)links.push(...feedLinks(xml,config.hosts));}
  for(const url of config.sitemaps||[]){const xml=await attempt({url},true);if(xml)links.push(...sitemapLinks(xml,config.hosts,today));}
  for(const url of [...(config.watch||[]),...knownURLs]){try{const safe=canonicalURL(url,config.hosts);if(isNewsArticleURL(safe))links.push({url:safe,dynamic:false,watch:(config.watch||[]).includes(url)});}catch{}}
  // Keep discovered URLs so the daily cap does not permanently hide old news.
  for(const link of links){const key=provider+'|'+link.url;state[key]={...state[key],discovered:true,titleHint:link.titleHint||state[key]?.titleHint||'',publishedOn:link.publishedOn||state[key]?.publishedOn||null};}
  for(const [key,value]of Object.entries(state))if(key.startsWith(provider+'|')&&value.discovered){const url=key.slice(provider.length+1);try{canonicalURL(url,config.hosts);if(isNewsArticleURL(url))links.push({url,titleHint:value.titleHint||'',publishedOn:value.publishedOn,dynamic:false});}catch{}}
  const seen=new Set(pages.map(p=>p.url.replace(/\/$/,'')));
  for(const spec of chooseArticles(links,state,provider,today,config.articleLimit||8).filter(p=>!seen.has(p.url.replace(/\/$/,'')))){const p=await attempt(spec);if(p)pages.push(p);}
  const read=new Set(pages.map(p=>p.url.replace(/\/$/,'')));
  const backlog=new Set(links.filter(p=>!read.has(p.url.replace(/\/$/,''))&&!saved(state,provider,p.url).checkedAt).map(p=>p.url.replace(/\/$/,''))).size;
  return {pages:pages.map(({links,feeds,...p})=>p),errors,discovered:new Set(links.map(p=>p.url.replace(/\/$/,''))).size,backlog};
}
