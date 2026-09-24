# Update: offizielle Ankündigungen erkennen

Dieses Paket enthält die frühere Stadtlisten-Korrektur und die neue Erkennung offizieller Ankündigungen. Es ersetzt die vorherige Korrektur-ZIP. Die vorhandenen Daten werden beim nächsten Lauf ergänzt; das Paket überschreibt keinen Daten-Snapshot.

## Installation ohne Cloud Shell

1. ZIP auf dem Computer entpacken.
2. Im Repository gintarssimon/robotaxi-radar auf der obersten Ebene **Add file → Upload files** öffnen.
3. Die enthaltenen Ordner **public**, **scripts**, **test** sowie **README.md** und **UPDATE-ANKUENDIGUNGEN.md** direkt hineinziehen. Nicht den übergeordneten ZIP-Ordner hochladen.
4. **Commit changes** auf main speichern.
5. **Actions → Robotaxi Radar aktualisieren → Run workflow → main → Run workflow** wählen. Einen neuen Lauf starten, keinen alten Lauf wiederholen.
6. Nach dem grünen Haken die Website neu laden und nach **München** suchen. Bei erfolgreichem Abruf der offiziellen Meldung erscheint Waymo mit **Angekündigt**, Ziel **Ende 2027**, Ankündigungsdatum **25.08.2026** und Quellenlink.

Die bestehende Firebase-Verbindung, GitHub-Secrets und der Zeitplan bleiben bestehen. Ein grüner Lauf kann weiterhin einzelne abgelehnte Quellen melden. Die Website nennt jetzt die betroffenen Anbieter. Ein Neuladen der Website löst keinen Quellenabruf aus.

## Automatik und Grenzen

- Eindeutige englische und deutsche Ankündigungen werden ohne kostenpflichtige API ausgewertet.
- Stadt, Partner, Veröffentlichungsdatum und Zieltermin werden im Zusammenhang geprüft.
- Vorbereitungen, Testfahrten und öffentlicher Fahrgastbetrieb werden getrennt. Eine geplante fahrerlose Fahrt belegt noch keinen heutigen fahrerlosen Betrieb.
- Jahre, Quartale, Halbjahre, Monate und genaue Tage behalten ihre Genauigkeit. „Ende 2027“ wird nicht zu einem erfundenen Starttag. Relative Jahresangaben beziehen sich auf das Veröffentlichungsdatum.
- Quellen kommen aus Blog-/Nachrichtenverzeichnissen, Waymos Sitemap und bereits bekannten Artikeln. München und Singapur werden zusätzlich als offizielle Beobachtungsquellen abgerufen; Termine werden aus den Artikeln gelesen, nicht fest im Programm eingetragen.
- Pro Anbieter und Lauf werden höchstens acht zusätzliche Artikel abgerufen. Neue Artikel werden bevorzugt, verarbeitete nach sieben Tagen erneut geprüft. Die bisherigen Stadtlisten werden täglich geprüft.
- Der Ortskatalog enthält 50 Städte. Unbekannte Orte, fehlende Veröffentlichungsdaten, unklare Partner, widersprüchliche Termine und nicht erkannte Formulierungen bleiben zur Prüfung. Keine vollständige weltweite Erfassung.
- Neue tatsächliche Starts werden aus den unterstützten Verfügbarkeitslisten erkannt. Eine allgemeine Auswertung aller bereits erfolgten Launches aus Artikeln ist nicht enthalten. Ein abgelaufener Zieltermin wird niemals automatisch „live“.
- HTTP 403/429 wird respektiert. Das Update beseitigt keine Zugriffssperren von Tesla oder Lyft.

Bei einem roten Actions-Lauf den fehlgeschlagenen Schritt öffnen und dessen Fehlermeldung teilen.
