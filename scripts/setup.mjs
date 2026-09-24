import { createInterface } from 'node:readline/promises';
import { stdin,stdout } from 'node:process';
import { writeFile } from 'node:fs/promises';
const prompt=createInterface({input:stdin,output:stdout});
try{
  console.log('Robotaxi Radar · Firebase-Projekt verbinden\nDie Projekt-ID findest du in der Firebase-Konsole unter Projekteinstellungen.');
  const projectId=(await prompt.question('Projekt-ID: ')).trim();
  if(!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId))throw new Error('Bitte eine gültige Google-Cloud/Firebase-Projekt-ID eingeben.');
  await writeFile('.firebaserc',JSON.stringify({projects:{default:projectId}},null,2));
  console.log('\nProjekt ausgewählt: '+projectId+'\nNoch nichts veröffentlicht. Die weiteren Schritte stehen in START-HIER.md.');
}finally{prompt.close();}
