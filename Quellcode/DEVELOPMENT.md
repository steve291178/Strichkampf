# Strichkampf – schrittweiser Umbau

## Etappe 1, 2. Oktober 2026

Treffer verwenden die gezeichnete KarateRig-Pose: Faust/Fuß gegen Kopf, Rumpf und Beine; passende Deckung erhält ihre hohen/tiefen Schutzregeln. Kontaktpartikel entstehen an der angreifenden Extremität. Das Kontaktfenster beginnt 55 ms vor voller Streckung, damit der sichtbare Weg zum Ziel mitzählt. Gleichzeitige Kontakte werden vor ihrer Auflösung gesammelt. Pause löscht vorgemerkte Angriffe. Der bestehende einzelne 120-ms-Eingabepuffer wurde beibehalten und geprüft. Netzwerkprotokoll v3 trennt alte und neue Kampfregeln.

Validierung: `node tests/combat.cjs` – 14 Simulationsprüfungen; Syntaxprüfung aller geänderten JS-Dateien; `python build.py`. Echter Controller, visuelle Browserprüfung und zwei Internetanschlüsse sind noch nicht getestet. Keine Behauptung eines echten Online-Ende-zu-Ende-Tests.

Nächster Nutzertest: Abstand und tatsächliche Kontakte, Blockhöhe, einzelne Eingaben kurz vor Ende einer Technik. Noch keine Überarbeitung von Haltung, Farben oder Sounds in dieser Etappe.

## Etappen 2–3, erster gemeinsamer Bewegungsstand

Tiefere Ausgangshaltung, sichtbare Deckung mit beiden Händen, klarere Gi-Konturen und gedeckte Kämpferfarben. Schritte behalten ihre belasteten Fußpunkte in Weltkoordinaten; Vor-/Rückwärtsschritte sind 36/30 Einheiten lang. Die hintere Gerade dreht Schulter und Hüfte stärker ein. Front- und Seitwärtstritt verlagern die Hüfte, ziehen das Knie an, strecken und holen kontrolliert zurück. Beinlängen sind 55+55, Arme 37+36; eine Reichweitenbegrenzung hält die Füße auf ihren Zielpunkten. Schrittunterbrechungen werden in die Angriffsvorbereitung übernommen. Die Schrittgerade bewegt den Körper mit einer geglätteten Gewichtsverlagerung um 20 Einheiten. Alle acht Techniken bleiben erhalten.

Validierung: 17 Prüfungen einschließlich vollständiger Technik-Posen, konstanten Segmentlängen und festen Standfüßen auf beiden Seiten. Zwölf Posen wurden mit der tatsächlichen Zeichenfunktion außerhalb des Browsers gerendert und visuell geprüft; dabei wurden ungünstige Ellbogenpositionen korrigiert. Das ersetzt keinen interaktiven Browser-/Controller-Test. Für gemeinsame Online-Duelle beide die neue Version nutzen (Protokoll v4).

Status: Etappen 1–3 in diesem Zwischenstand technisch umgesetzt; subjektives Kampfgefühl noch durch den Nutzer zu bewerten. Die folgenden Etappen 4–8 bleiben offen.

## Vereinbarte weitere Etappen

2. Klare Karatehaltung, gewichtete Vor-/Rückwärtsschritte, reduzierte Figuren mit Gi und gedeckten Farben.
3. Beide Geraden und Fronttritt als Qualitätsmaßstab; anschließend alle vorhandenen Techniken mit Hüfte, Balance und kontrollierter Rückkehr überarbeiten. Keine Kürzung des vereinbarten Umfangs.
4. Passende kurze Trefferreaktionen, dezenter Kontaktstopp und 80er-Kampfgeräusche.
5. Klassische Richtungs-/Aktionstastensteuerung (Originalreferenz prüfen) und bestehende direkte Steuerung getrennt von Spielregeln anbieten.
6. Punktemodus und Lebens-/Rundenmodus; zwei Rundensiege im Lebensmodus. Offen: zwei Punkte pro Match oder drei Punkte pro Runde im Punktemodus. Timer/Verlängerung später entscheiden.
7. KI-Fairness, Online, echte Controller, Pause/Revanche/Abbrüche gemeinsam testen.
8. Kurze Spieltests nach jeder Etappe, gezielte Balance anhand des Nutzerfeedbacks.


## Fortsetzung, 3. Oktober 2026 – DOJO / 07

Die nach dem letzten veröffentlichten Stand noch ungesicherten Entwürfe für Steuerung, Wertung, Reaktionen und Klang wurden übernommen und geprüft. Der bestehende Gesamtumfang mit acht Techniken bleibt erhalten.

- Schrittunterbrechungen übernehmen die aktuellen Fußpunkte in den Angriff. Das jeweilige Standbein hält seine Position; ein noch angehobener Fuß setzt während der Vorbereitung auf. Nach der Technik werden abweichende Fußpositionen mit zwei kleinen Schritten zurückgeführt. Auch Blocken mitten im Schritt lässt die Füße auslaufen. An der Arenagrenze wird kein leerer Gleitschritt begonnen.
- Front- und hinteres Bein wechseln bei aufeinanderfolgenden Tritten. Beide Seiten und Beine sind auf Kontakt, feste Segmentlängen und Standfußhaltung geprüft. Die Schrittgerade nutzt einen vorgehenden Fuß und ein nachziehendes Standbein.
- Grundstellung etwas aufgerichtet; breitere Schulterdarstellung und sichtbare vordere Gi-Öffnung. Beide Arme werden vor dem Rumpf lesbar gehalten. Ein Umfallen bleibt über der Bodenlinie.
- Klassik (Richtung + Aktion) und Direktsteuerung sind unabhängig von den Regeln wählbar. Klassik ist eine eigene vereinfachte Belegung, keine behauptete originalgetreue International-Karate-Steuerung. Die vom Nutzer beendete Originalrecherche wurde nicht wieder aufgenommen.
- Duell: 100 Leben, zwei Rundensiege. Punktkampf: ein Treffer/Punkt, standardmäßig zwei Punkte pro Match, alternativ drei. Doppeltreffer zählen nicht. 60/90 Sekunden optional. Verlängerung nach Gleichstand; Doppeltreffer erhalten die Verlängerung, im Punktkampf gewinnt der nächste eindeutige Treffer sofort das Match.
- Vorbereitete Trefferreaktionen, Kontaktstopps und synthetische 80er-Kampfgeräusche integriert. Serie nur im Duell, perfekter Block in beiden Modi.
- Netzwerkprotokoll v6; zuverlässiger Datenkanal für einzelne Tastenereignisse. Beide Mitspieler müssen DOJO / 07 verwenden. Publikum/Zugriff unverändert.

Validierung: 27 gezielte Prüfungen in `tests/combat.cjs`; `tests/integration.cjs` prüft Anwendungseingaben, simulierten Standardcontroller, Touch, Host/Gast-Regeln, Punktwertung, Revanche, beidseitige Pause, Gegnerverhalten und Canvas-Zeichenfunktionen. Aufruf der Integration mit installiertem `@napi-rs/canvas` über NODE_PATH. Posen wurden mit den tatsächlichen Zeichenfunktionen gerendert und visuell kontrolliert. JavaScript-Syntax, Build und Patchformat geprüft.

Grenzen: Keine interaktive Browserprüfung (für diese statische Site steht kein kompatibler verwalteter Preview-Server bereit), kein echter DualSense- oder Hörtest und kein Internet-Ende-zu-Ende-Test mit zwei Anschlüssen. Kein TURN-Relay. Nächster gemeinsamer Schritt ist die Abstimmung des Kampfgefühls durch Steve: Übergang Schritt/Tritt, beide Trittbeine, Lesbarkeit der geöffneten Haltung und Klassik-Steuerung. Weitere Designänderungen nach diesem Feedback, kein erneuter Komplettumbau.


## Fortsetzung, 30. Oktober 2026 – DOJO / 08 (Bauplan, Regelwerk-Schritte 2–5)

Umgesetzt nach `../PLAN.md` mit Entscheidungs-Log `../ENTSCHEIDUNGEN.md`; Quelle ist `../REGELWERK.md` v1.

- **KI (`src/ai.js`)**: eigenes Modul, drei Stufen (Grün, Schwarz, Meister 2) mit Reaktionsverzögerung 0,18/0,11/0,05 s, Blockquote 70/82/92 %, ein bis drei Kampfstile mit Wechsel. Entscheidet auf eigenem Takt und sofort bei Angriffsbeginn/-ende des Gegners; blind bis zur Reaktionszeit nach jedem Neustart. Einspeisbarer Zufall für wiederholbare Simulationen.
- **Gürtel (`src/progress.js`)**: elf Gürtel, Siege → Gürtel → KI-Stufe, Speicher mit Klammer 0–18, Rücksetzen im Hilfe-Dialog. Nur eigene Siege gegen den Computer zählen.
- **Engine (`src/engine.js`)**: 20 Trefferpunkte (leicht ½, stark 1), Dreier-Serie entfernt, Combo-System (Zähler, Takt 0,5 s, angezeigte Taste, Breaker = perfekter Block in Treffer 4–6, Show 7–9 nicht blockbar, Ende bei 9), Reaktionstabelle (Kopf 0,28/0,21 s, Körper 0,32/0,21, Knie 0,45/0,30, Sturz 0,65/0,50). Netzwerkprotokoll v7.
- **Figur (`src/rig.js`, `drawFighter`)**: Gewicht über dem Standfuß beim Schritt, Reaktionsposen Magen/Knie/Sturz, Becken, Taille, Schulterjoch, Gelenkscheiben, Füße, Kopfdetails. Gürtel am Gi (Variante `BELT_ON_GI`).
- **Effekte**: Funken, Ring, Schlaglinien, Blitz, Combo-Zähler, Großtext, Leuchtspur; Obergrenze 400; reduzierte Bewegung halbiert.
- **Ton (`src/audio.js`)**: nur Web Audio; Wusch, Treffer nach Reaktionsart, Block/Breaker, Gong, Stings, Kiai (Variante A/B), Ansager aus Formant-Synthese mit Warteschlange; Pegel je Familie, im Browser gemessen.

Validierung: `npm test` = 45 Engine-, 10 KI-, 8 Gürtel-, 6 Effekt-, 8 Ton- und 10 Integrationsprüfungen (87). Bildproben in `bildproben/`, Hörproben in `hoerproben/` (27 Klänge, alle im Zielpegel). Schlusstest des gebauten Spiels im eingebauten Browser der Claude-App (Start, Tastatur, Match gegen den Computer, Gürtel-Anzeige, Konsole ohne Fehler).

Grenzen: Kein echter Controller-Test, kein Internet-Ende-zu-Ende-Test mit zwei Anschlüssen, kein Touch-Gerät. Die Combo-Takt-Fenster und KI-Stufen warten auf Stefans Spieltest (Regelwerk §7: Feinabstimmung). Beobachtung: Mit 20 Trefferpunkten dauert eine Runde viermal so viele Treffer wie mit 100 Leben; so steht es im Regelwerk.
