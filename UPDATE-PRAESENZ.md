# Update: Betriebsstandorte und Fahrerlosigkeit richtig anzeigen

Dieses Gesamtupdate ersetzt die vorige Korrektur-ZIP und enthält auch die Erkennung offizieller Ankündigungen. Es benötigt keine kostenpflichtige API und keine neue Firebase-Einrichtung.

## Installation ohne Cloud Shell

1. Die neu heruntergeladene ZIP entpacken.
2. https://github.com/gintarssimon/robotaxi-radar öffnen. Auf der obersten Ebene **Add file → Upload files** wählen.
3. Die enthaltenen Ordner **public**, **scripts**, **test** und alle enthaltenen Markdown-Dateien direkt hineinziehen. Nicht den übergeordneten entpackten Ordner hochladen.
4. Mit **Commit changes** auf **main** speichern.
5. **Actions → Robotaxi Radar aktualisieren → Run workflow → main → Run workflow**: einen neuen Lauf starten, keinen alten erneut ausführen.
6. Nach dem grünen Haken https://robotaxiradar.web.app/ neu laden. Bei einer alten Ansicht Strg+Umschalt+R (Mac: Cmd+Umschalt+R).

Ein grüner Lauf kann einzelne blockierte Quellen enthalten. Die Meldung auf der Startseite nennt die betroffenen Anbieter. Ein Neuladen der Website lädt nur den letzten Datenstand, es startet keinen Quellenabruf.

## Was korrigiert wurde

- **Waymo wurde fälschlich mit null angezeigt:** Die alte Auswertung zählte nur als fahrerlos eingestufte Einträge. Der Abruf hatte 15 aktive Städte erkannt, aber die zusätzliche Fahrerlosigkeitsangabe verloren. Die Hauptzahl zählt jetzt belegten Fahrgastbetrieb; Fahrerlosigkeit wird getrennt gezeigt.
- **Belege wurden überschrieben:** Ein Verfügbarkeitsabruf ohne Aussage zu Begleitpersonal löscht eine vorhandene Einordnung nicht mehr. Der frühere Beleg bleibt mit seinem ursprünglichen Datum erhalten. Eine neue ausdrückliche Aussage kann ihn ersetzen.
- **Waymos aktive Fahrten werden neu geprüft:** Die aktuelle Waymo-Service-Seite bestätigt verfügbare Städte und die vollständig autonome Dienstleistung. Geplante Städte werden dadurch nicht zu laufendem Betrieb.
- **Alte Quellen verschwanden aus dem Vergleich:** Bekannte Standorte bleiben sichtbar; ältere Betriebsbelege werden mit Stern und Hinweis markiert. Sie sind kein Beweis für den heutigen Betrieb. Ohne aktuellen Fahrerlosigkeitsbeleg zählt ein Standort nicht in dieser zusätzlichen Teilzahl.
- **Wer fährt wo?** Unter jedem Anbieter lassen sich seine Standorte aufklappen. Ein Klick öffnet Details zu Status, Fahrsystem, Buchungsplattform und Quellen. Uber und Lyft können dieselbe Flotte vermitteln, die auch bei Waymo erscheint.
- **Zusätzliche Buchungsquellen:** Uber/Avride in Dallas, Uber/Motional in Las Vegas sowie Lyfts Waymo- und May-Mobility-Seiten werden regelmäßig geprüft. Übernommen werden passende Angaben aus dem Seiteninhalt, keine fest eingetragenen Marktstatuswerte.
- **Tesla-Quellenprüfung:** Die allgemeine Robotaxi-Landingpage ohne auswertbare Standortliste wird nicht mehr als Verfügbarkeitsquelle abgefragt. Maßgeblich bleibt die Supportseite.
- **Filter und Karte:** Der Filter „Mit Fahrgastbetrieb (alle)“ umfasst laufende und eingeschränkte Angebote. Ankündigungen, Tests und Pausen zählen nicht als laufender Fahrgastbetrieb. Die Karte unterscheidet diese Phasen optisch.

## Nach der Installation kontrollieren

- Bei allen Anbietern und Regionen zeigt Waymo bei unveränderter offizieller Stadtliste **15 Städte** statt null. Nach erfolgreichem Abruf der Service-Seite steht darunter **15 fahrerlos belegt**.
- „Standorte anzeigen“ unter Waymo öffnen und z. B. Austin oder San Francisco anklicken.
- München suchen: weiterhin **Angekündigt**, **Ende 2027**, kein laufender Betrieb.
- Bei Uber werden erfolgreich abgerufene zusätzliche Partnerangebote ergänzt. Bei einem abgelehnten Abruf bleibt der vorherige Stand erhalten.
- Eine Tesla-Verfügbarkeitsmeldung wird als Fahrgastbetrieb gezählt, auch wenn die Quelle die Anwesenheit von Begleitpersonal nicht für jeden Standort eindeutig klärt.

## Grenzen

Es bleibt ein Überblick ausgewählter offizieller Quellen und bekannter Städte, keine vollständige weltweite Echtzeitdatenbank. Unbekannte Orte und unklare Artikel bleiben zur Prüfung. Zugriffssperren werden nicht umgangen. Ein verstrichener Zieltermin ist kein Startnachweis. Ein alter oder nicht mehr genannter Eintrag wird nicht automatisch als eingestellt bezeichnet. Ein tatsächlich beendeter Betrieb benötigt einen neuen eindeutigen Beleg und gegebenenfalls manuelle Prüfung.

Die ZIP überschreibt keine vorhandenen Daten, GitHub-Secrets oder Workflows. Sie enthält die vollständigen Änderungen an Programm, Anzeige und Tests.
