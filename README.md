# Robotaxi Radar – kostenlose Firebase-Version

Statische Firebase-Website mit Karte, Liste und täglicher Quellenprüfung über GitHub Actions. Das aktuelle Gesamtupdate ist in **UPDATE-PRAESENZ.md** beschrieben. Es enthält auch die frühere Ankündigungserkennung.

## Befehle

- npm ci: Abhängigkeiten installieren
- npm test: Datenverarbeitung und Erkennung prüfen
- npm run refresh: öffentliche Quellen abrufen und public/data/snapshot.json aktualisieren
- npm run dev: lokale Vorschau
- npm run setup: bestehendes Firebase-Projekt auswählen
- npm run automation: vorhandene Firebase-GitHub-Verbindung für den täglichen Lauf nutzen

## Quellen und Auswertung

Die Stadtlisten von Waymo, Waymo/Uber und Tesla sowie offizielle Uber-Buchungsseiten für Dallas/Avride und Las Vegas/Motional und Lyft-Partnerseiten für Nashville/Waymo und Atlanta/May Mobility werden verarbeitet. Zusätzlich erkennt das Skript eindeutige offizielle Ankündigungen künftiger öffentlicher Fahrdienste auf Deutsch und Englisch. Stadt, Technologiepartner und Zielzeitraum werden im Kontext derselben Aussage geprüft. Veröffentlichung, Zieltermin und tatsächlicher Start sind getrennte Angaben.

Waymos Sitemap, Blog-/Nachrichtenverzeichnisse und bekannte Artikel liefern Quellen. München und Singapur sind zusätzliche Beobachtungsquellen; die allgemeinen Erkennungsregeln lesen deren Inhalte. Acht zusätzliche Artikel pro Anbieter und Lauf begrenzen die Abrufe. Neue Artikel werden bevorzugt; verarbeitete Artikel werden frühestens nach sieben Tagen erneut abgerufen. Ein 403 oder 429 stoppt weitere Anfragen an diesen Host im laufenden Durchgang.

Ein angekündigtes Jahr, Quartal oder „Ende 2027“ bleibt ungenau. Interne Jahresgrenzen dienen der Sortierung und Prüfung auf überfällige Ziele; sie sind keine behaupteten Starttage. Alte Meldungen dürfen aktuellen Fahrgastbetrieb nicht zurück auf angekündigt setzen. Fehlende Nennungen löschen keine vorhandenen Daten.

Unbekannte Orte, unklare Partner, fehlende Datumsbelege, widersprüchliche Angaben und andere nicht eindeutig verstandene Artikel bleiben in der Prüfliste. Der Ortskatalog umfasst 50 Städte. Die Quellenabdeckung ist nicht vollständig. Eindeutige englischsprachige Startmeldungen werden zusätzlich erkannt, wenn dieselbe Aussage Stadt, Partner und bereits verfügbaren öffentlichen Fahrgastbetrieb belegt. Andere Startmeldungen benötigen weiterhin Prüfung.

## Präsenz, Fahrerlosigkeit und Aktualität

Die Hauptzahl zählt zuletzt belegte Städte mit Fahrgastbetrieb (`live` oder `limited`) pro Anbieter einmal. Tests ohne belegten Fahrgastbetrieb, Ankündigungen und Pausen zählen nicht. Fahrerlosigkeit ist eine zusätzliche Eigenschaft und kein Voraussetzung für das Zählen von Fahrgastbetrieb. Aktuelle fahrerlose Belege, Begleitpersonal und fehlende aktuelle Belege werden separat ausgewiesen.

`drivingSource` hält die Quelle zur Betriebsform unabhängig vom aktuellen Verfügbarkeitsbeleg fest. Ein Abruf ohne diese Angabe erhält eine vorhandene Einordnung, aber erneuert deren Belegdatum nicht. Eine neue ausdrückliche Angabe kann sie ersetzen. Bei Waymo wird zusätzlich die aktuelle Service-Seite `/rides/` geprüft. Deren Einordnung wird nur auf die dort aktiv geführten Standorte angewendet; Ankündigungen bleiben offen.

Ältere Betriebsbelege verschwinden nicht aus den bekannten Standorten. Sie werden markiert: aktuelle Verfügbarkeitsseiten nach 14 Tagen, datierte Meldungen nach 90 Tagen. Alte Quellen oder fehlgeschlagene Abrufe sind keine bestätigte Betriebseinstellung und keine aktuelle Bestätigung. Die Rangliste ist ein Vergleich erfasster Standorte, keine vollständige Aussage über den heutigen Weltmarkt oder Fahrzeugzahlen.

## Kosten und Veröffentlichung

Firebase Hosting veröffentlicht ausschließlich public/. Es werden keine Cloud Functions, keine Datenbank und keine kostenpflichtige KI-API benötigt. Der bestehende Spark-Aufbau und der vorhandene GitHub-Workflow bleiben bestehen. Das Update-Paket enthält keine Zugangsdaten und überschreibt weder Workflow noch Daten-Snapshot.

Leaflet: BSD-2-Clause. Natural Earth: Public Domain. Quellen werden verlinkt, nicht vollständig weiterveröffentlicht.

## London-Ergänzung

Ubers britisches Nachrichtenverzeichnis wird ebenfalls geprüft. Datumszeilen vor der Überschrift werden als Veröffentlichungsbeleg erkannt. Die offizielle Wayve-Startmeldung ist als Beobachtungsquelle hinterlegt; Status und Partner werden aus ihrem Inhalt gelesen. Der Eintrag wird als Fahrgastbetrieb mit Begleitpersonal geführt. Der Veröffentlichungstag wird nicht als exakter Starttag ausgegeben. Mehrere Technologiepartner in derselben Stadt bleiben getrennte Einträge.
