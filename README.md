# Robotaxi Radar – Version 2026-09-24.6

Kostenlose statische Firebase-Website mit Karte, Liste und täglicher Quellenprüfung über GitHub Actions. **Installation: UPDATE-START-HIER.md.** Diese Anleitung ersetzt die älteren Update-Anleitungen.

## Geprüfter Bestand plus automatische Quellen

`public/data/verified.json` enthält 20 zusätzliche, anhand offizieller Meldungen eingeordnete Angebote und Vorhaben. Browser und täglicher Lauf führen diese mit dem vorhandenen Snapshot zusammen. Es entsteht kein zweiter, voneinander abweichender Merge-Algorithmus. Neuere Belege, bestehende Zusatzdaten und spätere Pausen bleiben erhalten. Ein Abruffehler löscht keine Daten. Das Lieferpaket ersetzt weder Snapshot noch GitHub-Secrets oder Workflows.

Mit dem geprüften bisherigen Stand von 47 Einträgen in 35 Städten ergibt sich eine Ansicht mit 67 Einträgen in 42 Städten. Neue automatische Belege können diese Zahlen ändern. Der Grundbestand wird nicht als heutiger Betriebsnachweis ausgegeben; Meldungen behalten ihr Veröffentlichungsdatum.

## Quellen und Verarbeitung

Geprüft werden offizielle Standortlisten und Buchungsseiten, regionale Uber-Newsrooms einschließlich Großbritannien, Deutschland, Schweiz und Spanien, Investor-Verzeichnisse, WeRide und Freenow. Artikel kommen aus Verzeichnissen, Waymos Sitemap, bekannten Beleg-URLs und auf den Indexseiten angebotenen RSS-/Atom-Feeds. Neue Artikel werden bevorzugt. Ungelesene Funde bleiben im Abrufstatus gespeichert.

Pro Lauf werden zusätzlich zu den Startseiten bis zu 8 Waymo-, 24 Uber- und 16 Lyft-Artikel verarbeitet. Verarbeitete Artikel werden nach sieben Tagen erneut berücksichtigt. Parser-Updates heben den alten Auswertungs-Cache auch am selben Tag auf. Bei HTTP 403 oder 429 werden weitere Abrufe desselben Hosts für diesen Durchgang gestoppt. Zugriffssperren werden nicht umgangen.

Unklare Meldungen und neue Ortsnamen erscheinen in der Prüfliste. Der Kartenkatalog umfasst 52 Städte; unbekannte Orte erhalten keinen erfundenen Kartenpunkt. Die regelbasierte Erkennung versteht nicht jede Formulierung. PDFs, reine Social-Media-Meldungen und sämtliche Quellen weltweit sind nicht automatisch abgedeckt. Unter „Quellenabdeckung und Prüfstand“ sind Abruffehler, ungelesene Funde und die installierte Version sichtbar.

## Status, Termine und Aktualität

`live` und `limited` zählen als zuletzt belegter Fahrgastbetrieb. `testing`, `announced`, `preparation` und `paused` zählen nicht. Ein laufender Test kann einen zukünftigen öffentlichen Zieltermin haben. Reine Rahmenvereinbarungen und angekündigte Testvorhaben erhalten keinen erfundenen öffentlichen Starttermin.

Ankündigungsdatum, Zielzeitraum und tatsächlicher Start werden getrennt gespeichert. Ein abgelaufenes Ziel wird niemals automatisch zum Start. Quartals- und Jahresgrenzen dienen der Sortierung; sie sind keine behaupteten Starttage. Die Betriebsform hat mit `drivingSource` einen eigenen Beleg. Ein Verfügbarkeitsabruf ohne diese Angabe erneuert keinen früheren Fahrerlosigkeitsbeleg.

Dynamische Verfügbarkeitsseiten gelten nach 14 Tagen ohne Abruf als älter, datierte Meldungen nach 90 Tagen seit Veröffentlichung. Ein neuer Abruf einer alten Meldung ist kein neuer Betriebsnachweis. Ältere Einträge bleiben mit Hinweis sichtbar. Pro Anbieter zählt jede Betriebsstadt einmal; Partnerflotten können bei mehreren Anbietern erscheinen.

## Befehle

- `npm ci`: Abhängigkeiten installieren.
- `npm test`: Erkennung, Statusregeln und Zusammenführung prüfen.
- `npm run refresh`: Grundbestand zusammenführen, Quellen lesen, Snapshot und Abrufstatus speichern.
- `npm run dev`: lokale Vorschau.
- `npm run build`: lokale Kartenbibliothek und Länderumrisse bereitstellen.

## Kosten

Firebase Hosting veröffentlicht ausschließlich `public/`. Keine Cloud Functions, Datenbank, kostenpflichtige KI-API oder neue Zugangsschlüssel. Der bestehende Spark-Aufbau und GitHub-Ablauf bleiben erhalten.

Leaflet: BSD-2-Clause. Natural Earth: Public Domain. Quellen werden verlinkt; Artikel werden nicht vollständig weiterveröffentlicht.
