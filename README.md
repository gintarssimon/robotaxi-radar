# Robotaxi Radar – kostenlose Firebase-Version

Statische Firebase-Website mit Karte, Liste und täglicher Quellenprüfung über GitHub Actions. Die Aktualisierung für offizielle Ankündigungen ist in **UPDATE-ANKUENDIGUNGEN.md** beschrieben.

## Befehle

- npm ci: Abhängigkeiten installieren
- npm test: Datenverarbeitung und Erkennung prüfen
- npm run refresh: öffentliche Quellen abrufen und public/data/snapshot.json aktualisieren
- npm run dev: lokale Vorschau
- npm run setup: bestehendes Firebase-Projekt auswählen
- npm run automation: vorhandene Firebase-GitHub-Verbindung für den täglichen Lauf nutzen

## Quellen und Auswertung

Die bisherigen Stadtlisten von Waymo, Waymo/Uber und Tesla werden weiter verarbeitet. Zusätzlich erkennt das Skript eindeutige offizielle Ankündigungen künftiger öffentlicher Fahrdienste auf Deutsch und Englisch. Stadt, Technologiepartner und Zielzeitraum werden im Kontext derselben Aussage geprüft. Veröffentlichung, Zieltermin und tatsächlicher Start sind getrennte Angaben.

Waymos Sitemap, Blog-/Nachrichtenverzeichnisse und bekannte Artikel liefern Quellen. München und Singapur sind zusätzliche Beobachtungsquellen; die allgemeinen Erkennungsregeln lesen deren Inhalte. Acht zusätzliche Artikel pro Anbieter und Lauf begrenzen die Abrufe. Neue Artikel werden bevorzugt; verarbeitete Artikel werden frühestens nach sieben Tagen erneut abgerufen. Ein 403 oder 429 stoppt weitere Anfragen an diesen Host im laufenden Durchgang.

Ein angekündigtes Jahr, Quartal oder „Ende 2027“ bleibt ungenau. Interne Jahresgrenzen dienen der Sortierung und Prüfung auf überfällige Ziele; sie sind keine behaupteten Starttage. Alte Meldungen dürfen aktuellen Fahrgastbetrieb nicht zurück auf angekündigt setzen. Fehlende Nennungen löschen keine vorhandenen Daten.

Unbekannte Orte, unklare Partner, fehlende Datumsbelege, widersprüchliche Angaben und andere nicht eindeutig verstandene Artikel bleiben in der Prüfliste. Der Ortskatalog umfasst 50 Städte. Die Quellenabdeckung ist nicht vollständig. Allgemeine Artikel über bereits erfolgte Starts benötigen weiterhin Prüfung.

## Kosten und Veröffentlichung

Firebase Hosting veröffentlicht ausschließlich public/. Es werden keine Cloud Functions, keine Datenbank und keine kostenpflichtige KI-API benötigt. Der bestehende Spark-Aufbau und der vorhandene GitHub-Workflow bleiben bestehen. Das Update-Paket enthält keine Zugangsdaten und überschreibt weder Workflow noch Daten-Snapshot.

Leaflet: BSD-2-Clause. Natural Earth: Public Domain. Quellen werden verlinkt, nicht vollständig weiterveröffentlicht.
