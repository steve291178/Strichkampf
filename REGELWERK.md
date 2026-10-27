# Strichkampf – Regelwerk v1

**Status: FREIGEGEBEN, eingefroren** · 27.10.2026, 03:32 Uhr · Grundlage: DOJO / 07 (Commit a758bcd)
Nach Freigabe durch Stefan wird v1 eingefroren. Änderungen danach nur als v2 mit Datum.
Markierung **[NEU]** = beschlossen, aber noch nicht im Code.

---

## 1. Konzept

**Einzeiler:** Ein guter Treffer beginnt mit dem richtigen Abstand.

**Drei Säulen – was der Spieler fühlen soll:**
1. **Reaktion** – Abstand, Timing, Block im richtigen Moment.
2. **Sportsgeist und Ehrgeiz zum Sieg** – Revanche wollen, Gürtel holen, besser werden.
3. **Power und Fun** – krasse Sounds und derbe Effekte bei simplen Strichmännchen.

**Vorbilder:**
| Spiel | Übernehmen |
|---|---|
| International Karate (C64) | Punktkampf, Richtungssteuerung (Klassik), Dojo-Stimmung der 80er |
| Killer Instinct (SNES) | Combo-System inkl. Combo Breaker, Ansager, krachende Effekte |

**Optik:** Strichmännchen, simpel, aber modern. Kein Slow-Mo.
(Gadgets/Farben/Kombinationen: Parkplatz Nr. 34, frühestens nach den Sounds.)

## 2. Spielwelt

- Arena 1280 Einheiten breit, Bodenlinie bei 542.
- Start: Koralle (Spieler 1) bei x = 450, Jade (Spieler 2) bei x = 830, einander zugewandt.
- Seitenwechsel möglich; „vor“ und „zurück“ beziehen sich immer auf den Gegner.

## 3. Spielmodi (Regeln)

**Duell – der neue Modus**
- **[NEU] 20 Trefferpunkte** pro Runde statt Lebensbalken. Leichte Technik −½, starke Technik −1.
- Zwei Rundensiege gewinnen das Match.
- Trefferpunkte und Combo werden nach jeder Runde zurückgesetzt.
- Gleichzeitiger K. o.: Runde zählt für keinen und wird wiederholt.
- **[NEU] Combo-System** nur hier (Abschnitt 5).

**Punktkampf – der klassische Modus (International Karate)**
- Ein ungeblockter Treffer = ein Punkt, Gegner fällt, beide zurück in Grundposition.
- Standard 2 Punkte zum Matchsieg, wählbar 3.
- Doppeltreffer zählen nicht. Keine Combos, perfekter Block bleibt.

**Zeitlimit (optional):** aus, 60 oder 90 Sekunden. Duell: pro Runde. Punktkampf: pro Match (nur Kampfzeit).
Nach Ablauf entscheiden Trefferpunkte bzw. Punkte. Gleichstand → Verlängerung: der nächste eindeutige Treffer entscheidet. Doppeltreffer entscheiden nicht.

**Steuerung** (Direkt oder Klassik) ist unabhängig von den Regeln wählbar.

## 4. Techniken (Zahlen stehen an einer Stelle: `Quellcode/src/engine.js`, `MOVES`)

| Technik | Art | Duell [NEU] | Ebene | Reichweite | Dauer (s) |
|---|---|---|---|---|---|
| Gerade | leicht | −½ | hoch | 88 | 0,38 |
| Schrittgerade | stark | −1 | hoch | 105 | 0,68 |
| Körperschlag | leicht | −½ | tief | 88 | 0,44 |
| Fronttritt | stark | −1 | hoch | 110 | 0,76 |
| Seitwärtstritt | stark | −1 | hoch | 120 | 0,90 |
| Beinfeger | leicht | −½ | tief | 103 | 0,79 |
| Sprungtritt | stark | −1 | hoch | 117 | 0,70 |

Im Code heute noch: leicht 10 / stark 20 von 100 Leben (gleiches Verhältnis).
Die Dreier-Serie entfällt und wird durch das Combo-System ersetzt.

## 5. Abwehr und Combo-System

**Abwehr**
- **Block oben** hält hohe Angriffe, **Block unten** Körperschlag und Beinfeger. Geblockt = kein Schaden.
- Während eines Angriffs kein Block. Über den Beinfeger kann man springen.
- **Perfekter Block:** Block kurz vor dem Treffer (Fenster 0,14 s) → Angreifer taumelt ca. 0,5 s.

**[NEU] Combo (nur Duell, Technik-Ketten im Takt, nach Killer Instinct)**
| Treffer | Phase | Regel |
|---|---|---|
| 1–3 | Auslöser | Drei Treffer in Folge öffnen die Combo-Chance |
| 4–6 | Kette | Läuft nur mit den richtigen Tasten im Takt weiter; **Combo Breaker** möglich |
| 7–9 | Show | Nicht mehr blockbar; Ansager und volle Effekte. Ende bei Treffer 9 |

- **Combo Breaker:** passender Block im richtigen Moment während Treffer 4–6.
- Maximal 9 Treffer pro Combo (stark: bis zu 9 von 20 Punkten).

## 6. Gegner und Fortschritt

**[NEU] KI – 3 Stufen**
| Stufe | Gürtel der KI | Verhalten |
|---|---|---|
| 1 | Grün | Schon anspruchsvoll; ein Kampfstil |
| 2 | Schwarz | Schneller, dichterer Block, mehr Stile |
| 3 | Schwarz – Meister 2 | Extrem schnell, drei Kampfstile, wechselt zwischen ihnen |
Mit jeder Stufe steigen Reaktionszeit und Blockquote.

**[NEU] Gürtel des Spielers (11 Stufen)**
Weiß · Weiß-Gelb · Gelb · Gelb-Orange · Orange · Orange-Grün · Grün · Grün-Schwarz · Schwarz · Meister 1 · Meister 2
- Start mit Weiß. **3 Siege = nächste volle Farbe**; der Zwischengürtel wird nach dem 2. Sieg angezeigt.
- Gegner ist die KI-Stufe über dir: bis Grün kämpfst du gegen Grün (9 Siege), dann wechselt der Gegner auf Schwarz usw.
- Der erreichte Gürtel wird gespeichert.

**Weitere Modi**
| Modus | Stand DOJO / 07 | Ziel |
|---|---|---|
| Online (Raumcode, Präfix `strichkampf-v6-`, Host bestimmt Regeln) | vorhanden, Zweinetz-Test offen | bleibt |
| Lokal zu zweit (Tastatur, Controller, gemischt) | fehlt | kommt nach den Sounds |

## 7. Reihenfolge und Prüfpunkte

| # | Schritt | Prüfpunkt (Fertig-Bedingung) |
|---|---|---|
| 1 | Regelwerk v1 freigeben | Stefan gibt frei, Commit auf GitHub |
| 2 | KI-Stufen und Gürtel | Jede KI-Stufe schlägt die vorige in ≥ 7 von 10 simulierten Matches; Feinabstimmung durch Spieltest (Stefan) |
| 3 | Duell auf 20 Trefferpunkte + Combo-System | *vor Beginn festlegen* |
| 4 | Neue Darstellung (Strichmännchen modern) | *vor Beginn festlegen* |
| 5 | Sounds und Ansager | *vor Beginn festlegen* |
| 6 | Lokal zu zweit | Zwei fehlerfreie Matches: Tastatur gegen Tastatur, Tastatur gegen Controller |

Nichts Neues, bevor der Prüfpunkt grün ist (Regel 8). Neue Ideen → Parkplatz (Regel 9).

## 8. Entscheidungen 27.10.2026

- **Abweichung vom Standard:** KI-Stufen kommen vor Playtest 1 (Schritt 19), weil kein zweiter Spieler vor Ort ist. Bewusst so entschieden.
- **Lokal zu zweit** kommt, aber nach Darstellung und Sounds.
- **Speichern:** Matches nicht; der erreichte Gürtel ja.
- **KI-Stufen** von ursprünglich 5 auf 3 reduziert; der Fortschritt läuft über die Gürtel.
- **Sicherung:** Ordner `Downloads/Spiele_Projekte/Strichkampf`, Git, GitHub `steve291178/Strichkampf` (öffentlich). Hauptkonto: steve291178.
