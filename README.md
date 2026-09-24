# Robotaxi Radar – Spark-Version

Kostenlose statische Firebase-Website mit Karte, Liste und vorbereiteter Quellenprüfung über GitHub Actions. Die vollständige Anleitung ohne Coding-Vorkenntnisse steht in `START-HIER.md`.

```bash
npm ci
npm run setup
npx firebase-tools@15.30.2 deploy --only hosting
```

Die Veröffentlichung allein aktiviert noch keine automatische Recherche. Dafür die GitHub-Einrichtung in der Anleitung durchführen.

## Technischer Überblick

- `firebase.json` veröffentlicht ausschließlich `public/` über Firebase Hosting.
- Die App liest `public/data/snapshot.json`; es gibt keinen serverseitigen API-Endpunkt.
- `npm run refresh` prüft ausgewählte öffentliche Quellen ohne KI-API. Bekannte explizite Stadtlisten werden verarbeitet, andere neue Seiten als ungeprüfte Hinweise gespeichert.
- `npm run automation` erzeugt nach `firebase init hosting:github` den täglichen GitHub-Workflow aus dem von Firebase angelegten Secret-Verweis.
- Quellenfehler bleiben sichtbar. Das Verschwinden einer Stadt bedeutet nicht automatisch Betriebseinstellung.
- `npm test` prüft die Datenlogik; `npm run dev` startet eine lokale Vorschau auf Port 5173.
- `npm run build` regeneriert lokale Kartenbibliotheken und Länderumrisse. Für die erste Veröffentlichung ist es nicht erforderlich, da diese Dateien mitgeliefert werden.

Die 44 Startdatensätze sind eine unvollständige Rechercheauswahl vom 23.09.2026. Die aktuelle Automatik erkennt Waymo-Stadtlisten, explizite Waymo/Uber-Verknüpfungen und Teslas Verfügbarkeitsliste. Freie Nachrichten, neue Zieltermine sowie Lyft und andere Uber-Partner benötigen zunächst Quellenprüfung und manuelle Datenergänzung. Der Ortskatalog enthält 50 Städte.

Kein Firebase- oder GitHub-Konto wurde durch die Vorbereitung verändert. Kontoverbindung, Cloud-Veröffentlichung und produktive Quellenprüfung müssen bei der Einrichtung geprüft werden. Die visuelle Browserprüfung war in der Vorbereitungsumgebung nicht verfügbar.

Leaflet: BSD-2-Clause, Lizenz unter `public/vendor/LEAFLET-LICENSE.txt`. Natural Earth: Public Domain. Quellen werden verlinkt, nicht vollständig als Artikel weiterveröffentlicht.
