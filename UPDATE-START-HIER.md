# Gesamtupdate 2026-09-24.6 installieren

Dieses Paket enthält die vollständige Korrektur für London sowie 20 ergänzte Angebote und Vorhaben. Es ersetzt die vorherige Korrektur-ZIP. Keine neue Firebase-Einrichtung und keine kostenpflichtige API nötig.

## Installation über GitHub

1. Die gerade heruntergeladene ZIP entpacken.
2. https://github.com/gintarssimon/robotaxi-radar öffnen. Oben auf **Add file → Upload files** klicken.
3. Aus der entpackten ZIP **public**, **scripts**, **test**, **README.md** und **UPDATE-START-HIER.md** direkt in das Upload-Feld ziehen. **Nicht den übergeordneten ZIP-Ordner hochladen.**
4. Unten **Commit changes** wählen und auf **main** speichern.
5. Auf GitHub **Actions → Robotaxi Radar aktualisieren → Run workflow → main → Run workflow** öffnen. Einen neuen Lauf starten; „Re-run jobs“ eines älteren Laufs verwendet möglicherweise den alten Programmstand.
6. Nach erfolgreicher Veröffentlichung https://robotaxiradar.web.app/ neu laden. Bei alter Ansicht **Strg+Umschalt+R**, am Mac **Cmd+Umschalt+R**.

## Sofort erkennen, ob das neue Update angekommen ist

- Am Seitenende muss **Version 2026-09-24.6** stehen.
- Unter **Quellenabdeckung und Prüfstand** muss auch der **Grundbestand 2026-09-24.6** geladen sein.
- Nach dem neuen täglichen Lauf steht dort zusätzlich **letzter automatischer Lauf 2026-09-24.6**.
- Auf GitHub muss die Datei **public/data/verified.json** existieren. Ihre erste Versionsangabe lautet ebenfalls **2026-09-24.6**.
- Fehlt die Version auf der Website, ist noch der ältere Stand veröffentlicht. Steht die Datei versehentlich unter einem zusätzlichen Unterordner, die enthaltenen Ordner erneut auf die oberste Repository-Ebene hochladen.

## Inhaltlich kontrollieren

Zuerst alle Filter zurücksetzen, dann **London** suchen. Es erscheinen drei getrennte Angebote:

| Anbieter / Partner | Einordnung |
|---|---|
| Uber / Wayve | Fahrgastbetrieb, mit Begleitpersonal, Betrieb belegt am 02.09.2026; genauer gemeinsamer Starttag bleibt offen |
| Lyft / Baidu Apollo Go | Test / Pilot; geplanter öffentlicher Start 2027 |
| Waymo | Bestehende Ankündigung, separat vom Uber-Angebot |

Neuere automatische Belege können diese Angaben später fortschreiben.

Weitere Ergänzungen: Dubai, Zagreb, Riad, Zürich, Madrid, Tokio, München, Arlington, San Francisco Bay Area, Houston, Los Angeles und Miami bei Uber; London, Dallas und Hamburg bei Lyft. In mehreren Städten gibt es zusätzliche Technologiepartner, etwa Rivian, Zoox, Autobrains und Momenta. Hamburgs Rahmenvereinbarung und Momentas geplante Münchner Tests stehen als **Vorhaben / Vorbereitung**, ohne erfundenen öffentlichen Starttermin.

Mit dem am 24.09.2026 geprüften bisherigen Snapshot zeigt die App nach dem Update **67 Einträge in 42 Städten**. Waymo behält **15** belegte Betriebsstädte; Uber hat **9**, darunter auch eingeschränkte Angebote und ältere Belege. Neue Quellen können diese Zahlen ändern. „Fahrgastbetrieb“ bedeutet nicht automatisch „fahrerlos“.

## Warum London bisher fehlte

Beim Abgleich enthielt das öffentliche Repository noch die vorherige Version ohne Startmeldungserkennung. Das frühere Paket verließ sich außerdem darauf, dass ein nachfolgender Abruf London ergänzt. Die neue Version liefert den bereits recherchierten Eintrag direkt als Grundbestand mit. Der Browser und der tägliche Lauf verwenden dieselben Zusammenführungsregeln.

## Was die neue Automatik verbessert

- Mehr regionale Quellen, Investor-Mitteilungen, Partnerseiten und angebotene RSS-/Atom-Feeds.
- Höheres Artikelbudget und gespeicherte ungelesene Funde.
- Neue Auswertung nach einem Parser-Update, auch bei einem früheren Abruf am selben Tag.
- Deutsche und englische Datumszeilen ohne Verschiebung durch die Server-Zeitzone.
- Öffentliche Pilotankündigungen werden erkannt; reine Tests werden nicht zu Fahrgastbetrieb.
- Neue Ortsnamen bleiben als konkrete Prüffunde sichtbar. Madrid und Zagreb sind im Kartenkatalog ergänzt.
- Abruffehler und ausstehende Funde werden unter **Quellenabdeckung und Prüfstand** angezeigt.

Ein erfolgreicher GitHub-Lauf kann weiterhin einzelne nicht erreichbare Quellen melden. Der geprüfte Grundbestand und bisherige Belege bleiben dann erhalten. „Ansicht aktualisieren“ lädt nur veröffentlichte Daten; es startet keinen neuen Quellenabruf.

Das Paket enthält keine Zugangsdaten, ersetzt keine Workflows und überschreibt keinen vorhandenen Snapshot. Es benötigt alle enthaltenen neuen JavaScript- und JSON-Dateien, insbesondere `public/baseline.js`, `public/merge.js` und `public/data/verified.json`.

Die Erfassung bleibt eine Kombination aus geprüftem Bestand und automatischen Regeln. Sie kann nicht garantieren, jede neue Meldung weltweit zu finden oder korrekt zu verstehen. Unbekannte Orte und unklare Aussagen müssen geprüft werden, bevor sie als bestätigte Starts erscheinen.
