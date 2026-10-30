# Strichkampf – Übergabe an Claude Code (Bauplan)

Stand: 30.10.2026, 01:00 · vorbereitet im Chat mit Manuel · Startsatz für Claude Code steht ganz unten.

## 1. Auftrag in einem Satz

Strichkampf per Skill **Bauplan** im Modus **selbstständig** um die Regelwerk-Schritte 2–5 erweitern – am Ende läuft das Spiel, funktioniert und hat richtig tolle Effekte und Sounds.

## 2. Schon von Stefan entschieden (Haltepunkte – nicht erneut fragen)

| Haltepunkt | Entscheidung |
|---|---|
| Modus | **selbstständig** |
| H8 Reihenfolge / Umfang | **Schritte 2–5 aus REGELWERK.md, Abschnitt 7**, in dieser Reihenfolge, in einem Lauf: 2 KI-Stufen + Gürtel · 3 Duell 20 Trefferpunkte + Combo · 4 neue Darstellung · 5 Sounds + Ansager |
| Nicht im Umfang | Schritt 6 „Lokal zu zweit“; Parkplatz Nr. 34 (Gadgets, Farben, Kombinationen) |
| Fachliche Quelle (H2) | **REGELWERK.md v1 ist eingefroren und die Quelle.** Jede Abweichung = Haltepunkt (Gespräch über Regelwerk v2) |
| Skill arcade-werkstatt | **ignorieren** (Stefan: gibt es evtl. nicht mehr) |

## 3. Steckbrief (vorgefüllt – Stefan bestätigt, H1)

| | |
|---|---|
| **Wofür** | 2D-Karate-Kampfspiel im Browser mit Strichmännchen: Duell, Punktkampf, gegen KI, online |
| **Warum** | Reaktion, Sportsgeist/Ehrgeiz (Gürtel holen), Power und Fun durch Sound und derbe Effekte |
| **Woher** | Tastatur, Controller, Touch; Online über PeerJS (Raumcode) |
| **Wohin** | `index.html` / `Strichkampf.html` (Build aus `Quellcode/`), GitHub `steve291178/Strichkampf` (öffentlich) |
| **Verarbeitung** | Kampf-Engine (`Quellcode/src/engine.js`, Zahlen in `MOVES`), Figur (`rig.js`), Ton (`audio.js`), Steuerung (`controls.js`), Ablauf (`game.js`); gespeichert wird nur der Gürtel |

## 4. Stefans Wünsche für Schritt 4 und 5 (Vorgaben, nicht Geschmacksfragen)

**Darstellung (Schritt 4)** – Strichmännchen bleiben, aber:
- Viel **echte Anatomie** erkennbar: Gewicht, Hüfte, Schultern, Gelenke, Balance.
- **Trefferreaktionen mit Wucht:** Körpertreffer drückt den Magen ein, der Getroffene krümmt sich; schwere Treffer → auf die Knie gehen; Beinfeger → Sturz.
- Richtig tolle optische Effekte bei Treffern (Kontakt, Combo-Show 7–9).
- Regelwerk gilt weiter: **kein Slow-Mo**.

**Sound (Schritt 5)**
- Schöne **Retro-Sounds**: 80er-Kung-Fu-Kino – Schlag-„Wusch“, krachende Treffer, Kiai-Schreie im Stil von Bruce-Lee-Filmen; dazu Ansager (Killer-Instinct-Art).
- **Nur selbst erzeugt** (Web Audio, wie bisher in `audio.js`). **Keine Film-Samples, keine fremden Aufnahmen** – urheberrechtlich geschützt.

## 5. Was der Plan noch braucht (Plan = Haltepunkt)

- Prüfpunkt Schritt 2 steht im Regelwerk: jede KI-Stufe schlägt die vorige in ≥ 7 von 10 simulierten Matches.
- Prüfpunkte für Schritt 3, 4, 5 sind im Regelwerk „vor Beginn festlegen“ → **im Plan messbar vorschlagen**, Stefan gibt sie mit dem Plan frei.
- Geschmack (H9): kleine Dinge als max. 2 Varianten bauen, Stefan wählt am Ende gesammelt.

## 6. Technische Hinweise aus dem Bestand

- Tests: `node tests/combat.cjs` (27 Prüfungen), `tests/integration.cjs` (braucht `@napi-rs/canvas` über NODE_PATH), Build: `python build.py` (alles in `Quellcode/`).
- `Quellcode/DEVELOPMENT.md` lesen: Grenzen des alten Stands (kein Browser-, Controller-, Hör- oder Zweinetz-Test).
- Engine-Änderungen brechen Online-Kompatibilität → Netzwerkprotokoll-Version hochzählen (heute v6, Präfix `strichkampf-v6-`).
- Git: Stand = GitHub, Tag `dojo-07` existiert. **`sicherung/` vor Schritt 0 in `.gitignore`** – das Repo ist öffentlich.
- **Push nur auf Stefans ausdrückliches Ja** (Bauplan-Regel).

## 7. Startsatz für Claude Code

Claude Code im Ordner `~/Downloads/Spiele_Projekte/Strichkampf` starten und eingeben:

> Bauplan. Lies zuerst UEBERGABE-BAUPLAN.md und REGELWERK.md. Modus selbstständig, Umfang Schritte 2 bis 5. Frag nur, was dort noch nicht entschieden ist.
