# Strichkampf – Entscheidungs-Log

Jede Frage, die im Projekt aufkommt, bekommt eine Zeile – egal ob Stefan oder Claude entschieden hat.
Stefan kann jede Zeile kippen: Zeile nennen, Claude baut zurück (Commit der Zeile = Rückweg).

**Einordnung:**
- **Kriterium K?**: Claude hat selbst entschieden nach den Bauplan-Kriterien (Nummer angeben).
- **Haltepunkt H?**: Stefan hat entschieden (Nummer angeben).
- **Variante**: Claude hat max. 2 Varianten gebaut, Stefan hat gewählt.

| Datum | Schritt | Frage | Entscheidung | Grund | Einordnung | Commit |
|---|---|---|---|---|---|---|
| 30.10.2026 | Plan | Modus | selbstständig | Übergabe §2 | Haltepunkt (Stefan) | – |
| 30.10.2026 | Plan | Umfang und Reihenfolge | Schritte 2–5 wie Regelwerk §7; Schritt 6 und Parkplatz 34 nicht | Übergabe §2 | H8 | – |
| 30.10.2026 | Plan | Fachliche Quelle | REGELWERK.md v1, eingefroren; Abweichung = Gespräch über v2 | Übergabe §2 | H2 | – |
| 30.10.2026 | Plan | Skill arcade-werkstatt | ignorieren | Übergabe §2 | Haltepunkt (Stefan) | – |
| 30.10.2026 | Plan | Sounds aus fremden Aufnahmen? | nein, nur Web Audio | Übergabe §4, Urheberrecht | Haltepunkt (Stefan) | – |
| 30.10.2026 | 0 | `sicherung/` ins Repo? | nein, in `.gitignore` | Repo ist öffentlich | Bauplan-Regel | schritt-0 |
| 30.10.2026 | 2 | Zählen Verluste für den Gürtel? | nein, nur Siege | Regelwerk §6 nennt nur Siege; ein Abzug wäre eine neue Regel (v2) | K5 | – |
| 30.10.2026 | 2 | KI-Stufe frei wählbar? | nein, automatisch nach Gürtel | Regelwerk §6: „Gegner ist die KI-Stufe über dir“ | K5 | – |
| 30.10.2026 | 2 | KI in eigener Datei `ai.js`? | ja | Prüfpunkt 7/10 braucht Simulation ohne Browser; wartbar ohne fremde Laufzeit | K1 | – |
| 30.10.2026 | 3 | Netzwerkprotokoll | v7, einmal für alle Engine-Änderungen der Schritte 3–4 | Versionsprüfung statt stillem Überschreiben; alter Stand wird abgewiesen | K2 | – |
| 30.10.2026 | 3 | Dreier-Serie | entfernt (Zug, Taste, Hilfetext) | Regelwerk §4: „entfällt, ersetzt durch Combo“ | K5 | – |
| 30.10.2026 | 4 | Slow-Mo | keiner; bestehender Kontaktstopp ≤ 0,065 s bleibt | Regelwerk §1 | K5 | – |
| 30.10.2026 | 3b | Combo-Kette „richtige Tasten im Takt“ | HUD zeigt nächste Taste (Schlag/Tritt im Wechsel), Fenster 0,5 s nach Kontakt | Frage 1, Empfehlung A | Haltepunkt H9 (Stefan) | – |
| 30.10.2026 | 5b | Stimme des Ansagers | eigene synthetische Stimme aus Web Audio, dazu Großtext | Frage 2, Empfehlung A | Haltepunkt H9 (Stefan) | – |
| 30.10.2026 | 4 | Paket @napi-rs/canvas installieren | ja, nur in Quellcode/ (node_modules ignoriert) | Frage 3, Empfehlung A; Integrationstest und Bildproben | Haltepunkt (Stefan) | – |
| 30.10.2026 | 2b | Siege im Punktkampf gegen den Computer | zählen für den Gürtel | Offen 1, Vorschlag angenommen; Regelwerk schränkt nicht ein | Haltepunkt (Stefan) | – |
| 30.10.2026 | 2b | Gürtel zurücksetzen | kleiner Knopf im Hilfe-Dialog, zweimal tippen | Offen 2, Vorschlag angenommen | Haltepunkt (Stefan) | – |
| 30.10.2026 | 5b | Sprache der Ansager-Rufe | Englisch wie beim Vorbild | Offen 3, Vorschlag angenommen | Haltepunkt (Stefan) | – |
| 30.10.2026 | 2a | Tempo des Zufalls-Bots im Prüfpunkt „Stufe 1 schon anspruchsvoll“ | 3 Entscheidungen je Sekunde, 40 % Angriffe | Ein 4/s-Dauerdrescher gewinnt in dieser Engine durch Schlagabtausch gegen jede KI mit menschlicher Reaktionszeit (Stufe 1 dort 63 %); 3/s entspricht einem hastigen Menschen | K9 (erst Daten prüfen, dann festlegen) | schritt-2a |
| 30.10.2026 | 2a | KI entscheidet nur im Takt oder auch bei Ereignissen? | sofort, wenn ein Angriff des Gegners beginnt oder endet; sonst im Takt | Wie ein Mensch; sonst addiert sich Takt zur Reaktionszeit und Stufe 1 blockt zu spät | K1 (nachvollziehbar, wartbar) | schritt-2a |
| 30.10.2026 | 2b | Gürtel am Gi der Figur zeigen? | ja, als Variante `BELT_ON_GI` (an); Zwischengürtel zweifarbig, Meister mit roten Marken | Regelwerk nennt die KI-Gürtel nach Farbe; kleine Geschmacksfrage → Stefan wählt am Ende | H9 klein (Variante) | schritt-2b |
| 30.10.2026 | 2b | KI direkt nach Rundenstart sehend? | nein, blind bis die Reaktionszeit vergangen ist | sonst blockt sie den allerersten Angriff ohne Verzögerung | K1 (nachvollziehbar) | schritt-2b |
| 30.10.2026 | 3a | Rundenlänge mit 20 TP (20 starke / 40 leichte Treffer, viermal länger als bisher) | so umgesetzt wie im Regelwerk; nur gemeldet | Regelwerk §3/§4 ist eingefroren; Änderung wäre v2 | K5 (Quelle zuerst), Hinweis an Stefan | schritt-3a |
| 30.10.2026 | 3a | Trefferpunkte als Zahl mit Komma („19,5“) neben dem Balken | ja | halbe Punkte müssen ablesbar sein | K6 (Daten folgerichtig) | schritt-3a |
| 30.10.2026 | 3b | Rückstoß des Getroffenen in der Kette | nur 4 Einheiten statt 9/16, sobald die Combo ≥ 4 Treffer hat | sonst ist der Takt von 0,5 s mit kurzen Techniken nicht erreichbar; Regelwerk legt den Rückstoß nicht fest | Entwurfsdetail ohne Kriterium – Stefan kann kippen | schritt-3b |
| 30.10.2026 | 3b | Combo Breaker = perfekter Block? | ja, derselbe Mechanismus (0,14 s), nur in Treffer 4–6 | Regelwerk §5: „passender Block im richtigen Moment“; ein zweites Zeitfenster wäre eine neue Regel | K5 | schritt-3b |
| 30.10.2026 | 4a | Wie stark wandert die Hüfte beim Schritt über den Standfuß? | 65 % des Wegs, glockenförmig je Halbschritt | Plan-Prüfpunkt „≤ 20 Einheiten“; 60 % reichten für den Vorwärtsschritt nicht | Plan-Vorgabe, Zahl selbst gewählt | schritt-4b |
| 30.10.2026 | 4b | Betäubung bei Knie (0,30 s) und Sturz (0,50 s) länger als bisher (0,21 s) | ja, wie im Plan | Stefans Wunsch (Übergabe §4); Regelwerk legt Betäubungszeiten nicht fest | Plan (von Stefan freigegeben) | schritt-4b |
| 30.10.2026 | 5a | Pegel-Zielbereich für Hintergrundgeräusche | Schritt, Landung, Sprung, Ketten-Blip, Combo verloren: −36 … −14 dBFS statt −12 … −1 | ein Schritt so laut wie ein Treffer wäre falsch; der Plan-Prüfpunkt war zu pauschal | Plan-Präzisierung (K6, Daten folgerichtig) | schritt-5b |
| 30.10.2026 | 5a | Kompressor und Pegel | Schwelle −10 dB, Knie 4, Verhältnis 4, Master 0,9; Pegel je Klangfamilie in `LEVEL` | Standard-Knie (30 dB) drückte alles auf −20 … −50 dBFS; gemessen im Browser | K1 (nachvollziehbar, an einer Stelle) | schritt-5b |
| 30.10.2026 | 5a | Kiai-Variante | A (langes „Wataaa“) aktiv, B („Hyah“) als Hörprobe | kleine Geschmacksfrage | H9 klein (Variante, Stefan wählt) | schritt-5b |
