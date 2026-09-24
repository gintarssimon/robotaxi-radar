import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
const config=JSON.parse(await readFile('.firebaserc','utf8'));
const project=config.projects?.default;
if(!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project||''))throw new Error('Zuerst npm run setup ausführen.');
await mkdir('.github/workflows',{recursive:true});
const generated=(await readdir('.github/workflows')).filter(f=>/^firebase-hosting.*\.ya?ml$/.test(f));
let secret;
for(const file of generated){const text=await readFile('.github/workflows/'+file,'utf8');secret ||= text.match(/firebaseServiceAccount:\s*\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}/)?.[1];}
if(!secret)throw new Error('Zuerst firebase init hosting:github ausführen. Kein von Firebase erzeugter Schlüsselverweis gefunden.');
const workflow=`name: Robotaxi Radar aktualisieren
on:
  workflow_dispatch:
  schedule:
    - cron: '17 5 * * *'
permissions:
  contents: write
concurrency:
  group: robotaxi-radar-update
  cancel-in-progress: false
jobs:
  update:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run refresh
      - name: Aktualisierten Datenstand behalten
        run: |
          git config user.name 'github-actions[bot]'
          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          git add public/data/snapshot.json .radar/source-state.json
          if ! git diff --cached --quiet; then
            git commit -m 'Aktualisiere Quellenstand'
            git push
          fi
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          firebaseServiceAccount: \${{ secrets.${secret} }}
          projectId: ${project}
          channelId: live
`;
await writeFile('.github/workflows/robotaxi-daily.yml',workflow);
console.log('Täglicher Ablauf erstellt: .github/workflows/robotaxi-daily.yml\nDie Datei muss noch mit den Projektdateien auf GitHub veröffentlicht werden.\nEs wurde kein Lauf gestartet und kein Schlüssel angezeigt.');
