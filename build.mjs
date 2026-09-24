import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { feature } from 'topojson-client';
await mkdir('public/vendor', { recursive: true });
for (const file of ['leaflet.js', 'leaflet.css']) await copyFile(`node_modules/leaflet/dist/${file}`, `public/vendor/${file}`);
await copyFile('node_modules/leaflet/LICENSE', 'public/vendor/LEAFLET-LICENSE.txt');
const world = JSON.parse(await readFile('node_modules/world-atlas/countries-110m.json', 'utf8'));
await writeFile('public/data/world.json', JSON.stringify(feature(world, world.objects.countries)));
console.log('App und Firebase-Daten sind bereit.');
