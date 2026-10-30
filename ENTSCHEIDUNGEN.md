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
