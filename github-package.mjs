import {copyFile,access,unlink} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await access('.github/workflows/robotaxi-daily.yml');
await copyFile('.github/workflows/robotaxi-daily.yml','robotaxi-daily.yml');
// Replace an earlier generated archive so that removed files cannot survive in it.
try{await unlink('Robotaxi-GitHub.zip');}catch(e){if(e.code!=='ENOENT')throw e;}
const files=['public','scripts','test','package.json','package-lock.json','firebase.json','README.md','robotaxi-daily.yml'];
const result=spawnSync('zip',['-qr','Robotaxi-GitHub.zip',...files],{stdio:'inherit'});
if(result.error||result.status!==0)throw new Error('ZIP konnte nicht erstellt werden. Ist zip in Cloud Shell verfügbar?');
console.log('Robotaxi-GitHub.zip erstellt. Es enthält ausschließlich App-Dateien und den Workflow; keine lokalen Zugangsdaten.');
