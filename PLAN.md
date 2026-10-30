# Strichkampf – Schrittplan (Regelwerk-Schritte 2–5)

Stand: 30.10.2026 · Projektart: Spiel · Modus: selbstständig · Zielgruppe: Stefan (Solo gegen KI), Stefan + Andreas (online)
**Status: ENTWURF – Freigabe durch Stefan offen (Plan = Haltepunkt).**

Quelle für alle Regeln: `REGELWERK.md` v1 (eingefroren). Jede Abweichung davon ist ein Haltepunkt (H2).
Prüfpunkte für Schritt 3, 4, 5 standen im Regelwerk auf „vor Beginn festlegen“ – sie stehen hier als Vorschlag und werden mit diesem Plan freigegeben.

## Steckbrief (aus der Übergabe vorgefüllt – Stefan bestätigt, H1)

| | |
|---|---|
| **Wofür** | 2D-Karate-Kampfspiel im Browser mit Strichmännchen: Duell, Punktkampf, gegen KI, online |
| **Warum** | Reaktion, Sportsgeist/Ehrgeiz (Gürtel holen), Power und Fun durch Sound und derbe Effekte |
| **Woher** | Tastatur, Controller, Touch; online über PeerJS (Raumcode) |
| **Wohin** | `index.html` / `Strichkampf.html` (Build aus `Quellcode/`), GitHub `steve291178/Strichkampf` (öffentlich); Push nur auf Stefans Ja |
| **Verarbeitung** | Kampf-Engine (`engine.js`, Zahlen in `MOVES`), Figur (`rig.js`), Ton (`audio.js`), Steuerung (`controls.js`), Ablauf (`game.js`); neu: KI (`ai.js`), Fortschritt/Gürtel (`progress.js`); gespeichert wird nur der Gürtel (localStorage) |

## Entscheidungen aus der Übergabe (bereits von Stefan, nicht erneut gefragt)

- Modus selbstständig; Umfang Schritte 2–5 in Regelwerk-Reihenfolge; Schritt 6 und Parkplatz Nr. 34 nicht im Umfang.
- Regelwerk v1 ist die Quelle. Skill arcade-werkstatt wird ignoriert.
- Darstellung: Strichmännchen bleiben, echte Anatomie, Trefferreaktionen mit Wucht (Magen, Knie, Sturz), tolle Effekte, kein Slow-Mo.
- Sound: Retro-80er-Kung-Fu, Kiai, Ansager wie Killer Instinct – nur selbst erzeugt (Web Audio), keine Film-Samples.

## Fragerunde (offen – Stefan antwortet mit dem Plan)

Siehe Nachricht im Chat. Die Antworten werden hier und in `ENTSCHEIDUNGEN.md` nachgetragen.

Selbst entschiedene Punkte stehen im Entscheidungs-Log (`ENTSCHEIDUNGEN.md`) mit Kriterium.

## Aliase (Simulation)

- Spieler 1 = Koralle (Stefan), Spieler 2 = Jade (Computer oder Gegner). Keine Klarnamen im Code.

## Ablauf je Schritt

1. „Erwartet: …“ steht unten je Schritt (Grenzwerte beider Seiten, kaputte Eingaben, ruhiges Verhalten bei fehlenden Daten).
2. Bauen.
3. Testbefehle ausführen → „Ergebnis: …“ wird neben die Erwartung geschrieben.
4. TODO-Reste suchen (`grep -n TODO`), Kommentare gegen Code prüfen, Namenssuche (nur Aliase).
5. Freigabe: selbstständig → alle Tests grün und kein Haltepunkt.
6. Sicherung: git-Commit mit Bericht + Tag `schritt-N`, Rückweg einmal ausprobieren.

Rückweg je Schritt: `git restore --source=schritt-<vorheriger> --staged --worktree -- .` und danach `git clean -f`.

Testbefehle (alle im Ordner `Quellcode/`): `node tests/combat.cjs` (Engine), `node tests/ki.cjs` (KI, neu), `node tests/fortschritt.cjs` (Gürtel, neu), `node tests/integration.cjs` (braucht `@napi-rs/canvas`, siehe Frage 3), `python3 build.py` (Build). Die neuen Tests laufen ohne Browser.

## Schritte

### 0 · Sicherung der Ausgangslage — erledigt 30.10.2026
- `sicherung/` in `.gitignore` (Repo ist öffentlich). Kopie nach `sicherung/2026-10-30_schritt-0/`, Prüfsummen verglichen, Tag `schritt-0`, Rückweg ausprobiert.
- **Erwartet:** Prüfsummen Original = Kopie; Rückweg stellt eine geänderte Datei wieder her und entfernt eine neue Datei.
- **Ergebnis:** siehe Bericht im Chat.

### 2a · KI als eigenes Modul mit drei Stufen (Regelwerk §6)
- Die KI zieht aus `game.js` in `Quellcode/src/ai.js` (gleiche Eingaben wie ein Mensch, liest den Zustand mit Verzögerung, kein Schummeln). Drei Stufen als Zahlentabelle: Reaktionsverzögerung, Entscheidungstakt, Blockquote, Kampfstile. Stufe 1 (Grün): ein Stil. Stufe 2 (Schwarz): schneller, dichter Block, zwei Stile, Wechsel je Runde. Stufe 3 (Meister 2): extrem schnell, drei Stile, Wechsel alle 4 Sekunden oder nach kassiertem Treffer. Zufall ist einspeisbar (fester Startwert in Tests).
- **Erwartet:** Stufe 2 schlägt Stufe 1 in ≥ 7 von 10 simulierten Duell-Matches; Stufe 3 schlägt Stufe 2 in ≥ 7 von 10 (Prüfpunkt Regelwerk §7). Stufe 1 schlägt einen Zufalls-Bot (wahllose Tasten) in ≥ 9 von 10 („schon anspruchsvoll“). Reaktionsverzögerung sinkt und Blockquote steigt von Stufe zu Stufe (Test liest die Tabelle). Stilwechsel zählbar: Stufe 1 = 0 Wechsel, Stufe 2 ≥ 1 je Match, Stufe 3 ≥ 3 je Match. Kaputte Stufen (0, 4, −1, `null`, „x“) → Stufe 1, kein Fehler. Gleicher Startwert = gleicher Spielverlauf. Alte 27 Prüfungen bleiben grün.

### 2b · Gürtel des Spielers (Regelwerk §6)
- `Quellcode/src/progress.js`: 11 Gürtel, Siege → Gürtel, Gürtel → KI-Stufe, Speichern/Laden. Anzeige im Startbild (Gürtel, Gegnerstufe, Siege bis zum nächsten Gürtel), im Ergebnis („Neuer Gürtel: …“) und am Gi der Figur (Spieler: Ranggürtel, KI: Grün/Schwarz).
- **Erwartet:** Siege → Gürtel: 0 Weiß · 2 Weiß-Gelb · 3 Gelb · 5 Gelb-Orange · 6 Orange · 8 Orange-Grün · 9 Grün · 11 Grün-Schwarz · 12 Schwarz · 15 Meister 1 · 18 Meister 2 (Grenzen beider Seiten: 1/2, 2/3, 8/9, 11/12, 17/18). KI-Gegner: 0–8 Siege → Stufe 1, 9–11 → Stufe 2, ab 12 → Stufe 3 (Grenzen 8/9, 11/12). Nur Siege gegen den Computer zählen (Duell und Punktkampf); Verluste und Online-Matches ändern nichts; 19 und mehr Siege bleiben Meister 2. Kaputte Speicherwerte (leer, `null`, −1, 101, „abc“, 2,5) → 0 bzw. 18, kein Fehler. Speicher nicht verfügbar (privater Modus) → Spiel läuft, Gürtel gilt nur für die Sitzung. Nach einem Sieg gegen den Computer steht der neue Stand im Speicher; nach Neuladen wird er angezeigt.

### 3a · Duell auf 20 Trefferpunkte (Regelwerk §3, §4)
- `MOVES`: leicht −½, stark −1; Runde startet mit 20. HUD zeigt Zahl und Balken auf 20. Dreier-Serie entfällt (Zug, Taste J+K / R1 / Touch „Serie“, Hilfetext). Netzwerkprotokoll v7 (Präfix `strichkampf-v7-`), da sich die Engine ändert.
- **Erwartet:** Jede der 7 Techniken zieht genau ihren Wert aus Regelwerk §4 ab. 0 bleibt 0 (0,5 − 1 → 0, nie negativ). Runde setzt auf 20 zurück. Zeitablauf: mehr Punkte gewinnt (10,5 : 10 → Spieler 1; 10 : 10 → Verlängerung). Punktkampf unverändert. Zustandsprüfung online akzeptiert 0–20, lehnt 21 und −1 ab; Gast mit v6 wird abgewiesen. `grep -n Serie` findet nur noch Changelog/Sicherung. Alte Tests auf 20 umgestellt, alle grün.

### 3b · Combo-System (Regelwerk §5, nur Duell)
- Zähler je Kämpfer. Treffer 1–3: drei ungeblockte Treffer in Folge (ohne selbst getroffen zu werden) → Combo-Chance. Treffer 4–6 (Kette): nächste Technik muss im Takt beginnen (≤ 0,50 s nach dem letzten Kontakt) und die richtige Taste sein (Frage 1); Combo Breaker = passender Block ≤ 0,14 s vor dem Kontakt (wie perfekter Block) → Angreifer taumelt 0,55 s, Zähler 0. Treffer 7–9 (Show): Block wirkt nicht, volle Effekte, Ende bei 9. KI: Stufe 3 nutzt die Kette, Stufe 2/3 versuchen den Breaker.
- **Erwartet:** 2 Treffer lösen nichts aus, der 3. öffnet die Chance (Grenze 2/3). Takt: 0,49 s zählt, 0,51 s bricht ab. Falsche Taste bricht ab. Geblockter Treffer in 4–6 bricht ab. Breaker: Block 0,13 s vor Kontakt zählt, 0,15 s nicht; beim 7. Treffer kein Breaker mehr (Grenze 6/7). 7–9: Block gedrückt → Schaden trotzdem. Nach dem 9. Treffer Zähler 0, der 10. ist wieder „1“. 9 starke Treffer = 9 Punkte. Eigener kassierter Treffer und Rundenende setzen auf 0. Punktkampf: nie Combo-Ereignisse, Block wirkt immer. Online: Ablauf nach Serialisierung identisch (Determinismus-Test mit Combo). KI-Regression: 7/10 aus 2a bleibt grün; Stufe 3 erreicht in 10 Matches gegen Stufe 1 mindestens eine Combo ≥ 4.

### 4a · Anatomie und Haltung (rig.js, Zeichnung)
- Becken, Taille, Brustkorb, Schulterlinie dreht mit der Hüfte, Knie und Ellbogen als sichtbare Gelenke, Gewicht über dem belasteten Fuß, Balance in Grundstellung und Block. Strichmännchen bleiben (schlanke Glieder, keine Muskelfiguren).
- **Erwartet:** Segmentlängen konstant (bestehender Test). Hüfte horizontal ≤ 20 Einheiten vom Standfuß in der Standphase eines Schritts; in Grundstellung und Block liegt die Hüfte zwischen den Füßen. Nichts unter der Bodenlinie. 15 Posen als PNG-Bildprobe in `Quellcode/bildproben/` (Frage 3) – Stefan sieht sie an (H9: kleine Dinge als 2 Varianten).

### 4b · Trefferreaktionen mit Wucht (engine.js, rig.js)
- Körpertreffer: Magen eingedrückt, Oberkörper krümmt sich, Hände zum Bauch. Starker Treffer (−1): auf die Knie. Beinfeger: Sturz und Aufstehen. Punktkampf: Umfallen wie bisher.
- **Erwartet:** Körpertreffer: Oberkörper ≥ 0,45 rad nach vorn, Hüfte ≥ 8 Einheiten tiefer. Knie: Hüfte ≥ 35 tiefer, hinteres Knie ≤ 12 über Boden, Dauer 0,45 s, Betäubung 0,30 s (statt 0,21). Sturz: Kopf ≤ 60 über Boden nach 0,25 s, aufgestanden bis 0,65 s, Betäubung 0,50 s (statt 0,21). Während Knie/Sturz kein Block und kein Angriff, danach sofort frei. Alle Reaktionen enden in der Grundstellung, Segmentlängen konstant. Kein Slow-Mo: Kontaktstopp höchstens 0,065 s (Test). KI-Regression 7/10 bleibt grün.

### 4c · Effekte bei Treffern (game.js)
- Kontaktblitz, Schlaglinien, Funken nach Stärke; Bildwackeln; Block-Funkenring; Breaker: goldener Blitz + „COMBO BREAKER“; Show 7–9: Großtext „7 TREFFER“ bis „9 TREFFER“, Farbblitz, Leuchtspur an der schlagenden Extremität. `prefers-reduced-motion` halbiert alles.
- **Erwartet:** Partikel je Treffer: leicht 7, stark 14, Show 28; Bildwackeln 0,04 s leicht / 0,08 s stark. 60 Sekunden Simulation mit 30 Treffern: nie mehr als 400 Partikel gleichzeitig, kein Fehler. Bildprobe PNG je Effekt (Frage 3). Kontaktstopp unverändert (kein Slow-Mo).

### 5a · Kampfgeräusche (audio.js, nur Web Audio)
- Schlag-„Wusch“ leicht/stark, krachende Treffer (Kopf, Körper, Knie, Sturz), Block, perfekter Block, Breaker, Schritt, Landung, Sprung, Start, Runde, Match, Gürtel. Kiai (Bruce-Lee-Art) bei starken Treffern und Combo-Start – zwei Varianten, Stefan wählt am Ende.
- **Erwartet:** Zuordnung Ereignis → Klang vollständig: Test mit Schein-AudioContext, jedes Ereignis erzeugt ≥ 1 Klangknoten, kein Fehler. `grep` in `audio.js` findet kein `http`, `fetch`, `.mp3`, `.wav`. Spitzenpegel jedes Klangs zwischen −12 und −1 dBFS (OfflineAudioContext im Browser; Hörprobe als WAV in `Quellcode/hoerproben/`). Kein Klang länger als 1,2 s außer Ansager. Ton aus → kein Klangknoten.

### 5b · Ansager (audio.js, game.js)
- Rufe wie beim Vorbild auf Englisch mit Großtext: „FIGHT!“, Combo-Chance, „7 … 8 … 9“ in der Show, „COMBO BREAKER!“, „PERFECT!“ (perfekter Block), „K.O.!“, Rundensieg, Matchsieg, „NEW BELT!“. Stimme je Antwort auf Frage 2.
- **Erwartet:** Jede der Ansagen hat einen Auslöser im Spielablauf (Test zählt Ereignis → Ansage). Nie zwei Ansagen gleichzeitig: Warteschlange, höchstens eine wartend, neue verdrängt ältere gleicher Art. Ton aus → kein Klang, Text bleibt. Hörprobe als WAV.

### 6 · Schlusstest mit zweiter Quelle
- Erste Quelle: Node-Simulationen (Tests). Zweite, unabhängige Quelle: das gebaute Spiel im eingebauten Browser (lokaler Static-Server), ein Match gegen die KI mit skriptgesteuerten Tastendrücken, Prüfung von HUD, Speicher und Konsole. Dritte Quelle: Stefans Spieltest (Regelwerk §7: Feinabstimmung).
- Außerdem: `LIES-MICH.txt`, `DEVELOPMENT.md`, Hilfetext und Startbild auf den neuen Stand; Version „DOJO / 08“; `index.html` = `Strichkampf.html` (gleiche Prüfsumme).
- **Erwartet:** Browser-Match ohne Konsolenfehler; 20 Trefferpunkte, Combo-Anzeige und Gürtel sichtbar; Sieg speichert den Gürtel, Neuladen zeigt ihn; Hilfe nennt 20 TP, Combo, Gürtel und keine „Serie“. Build-Prüfsummen identisch. Veröffentlichung (Push) erst nach Stefans Ja (H6).
