import {parseAvailability} from './free-rules.mjs';
import {parseAnnouncements,isRelevantArticle,unknownPlaces} from './announcements.mjs';
import {parseLaunches} from './launches.mjs';
export function analyzePage(provider,page,cities,today){
  const plans=parseAnnouncements(provider,page,cities,today),launches=parseLaunches(provider,page,cities,today);
  const records=[...parseAvailability(provider,page,cities,today),...plans.records,...launches.records];
  let issues=[...plans.issues.filter(i=>!launches.records.length||i.reason!=='Keine eindeutige Ankündigung eines künftigen öffentlichen Fahrdienstes erkannt.'),...launches.issues];
  const relevant=isRelevantArticle(provider,page);
  if(relevant&&!records.length&&!issues.length)issues.push({reason:'Relevante Meldung noch nicht eindeutig eingeordnet.',places:unknownPlaces(page.title+' '+(page.blocks||[]).slice(0,6).join(' '),cities)});
  return {records,issues,relevant,announcements:plans.records.length,launches:launches.records.length};
}
