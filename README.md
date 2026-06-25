# Block Blast Clone 🧩

Ein Block-Blast-ähnliches Puzzle-Spiel – reines HTML, CSS und JavaScript, ohne
Abhängigkeiten oder Build-Schritt. Funktioniert auf Desktop (Maus) und Handy
(Touch).

## Spielen

Einfach `index.html` im Browser öffnen:

```bash
# direkt öffnen
open index.html        # macOS
xdg-open index.html    # Linux

# oder über einen lokalen Server (empfohlen für Handy im selben WLAN)
python3 -m http.server 8000
# dann http://localhost:8000 aufrufen
```

## Spielregeln

- Ziehe die drei angebotenen Block-Formen aus dem unteren Bereich auf das
  **8×8-Raster**.
- Sobald eine **Reihe oder Spalte komplett** gefüllt ist, löst sie sich auf und
  gibt Platz frei.
- Werden mehrere Linien gleichzeitig gelöst, gibt es einen **Combo-Bonus**.
- Sind alle drei Teile platziert, kommen drei neue.
- **Game Over**, wenn keines der aktuellen Teile mehr aufs Feld passt.

Die beste Punktzahl wird lokal im Browser (`localStorage`) gespeichert.

## Features

- 🔊 **Sound-Effekte** – per Web Audio API erzeugt (keine Audio-Dateien nötig),
  mit Ton-an/aus-Schalter.
- ✨ **Animationen** – Partikel-Explosion und schwebende Punkte-Anzeige beim
  Auflösen von Linien, animierter hochzählender Punktestand.
- ↩︎ **Rückgängig (Undo)** – macht den letzten Zug rückgängig (ein Schritt).
- 🎚️ **Schwierigkeitsgrade** – *Einfach* (mehr kleine Teile), *Normal*
  (gleichverteilt) und *Schwer* (mehr große Teile). Ein Wechsel startet ein
  neues Spiel.

Einstellungen (Schwierigkeit, Ton) und Highscore werden im `localStorage`
gespeichert.

## Steuerung

- **Maus:** Teil anklicken, auf das Feld ziehen, loslassen.
- **Touch:** Teil antippen und mit dem Finger ziehen. Die Vorschau erscheint
  leicht oberhalb des Fingers, damit man die Zielposition sieht.

## Dateien

| Datei        | Inhalt                                   |
|--------------|------------------------------------------|
| `index.html` | Struktur / Markup                        |
| `style.css`  | Layout, Farben, responsives Design       |
| `game.js`    | Spiellogik, Canvas-Rendering, Drag & Drop |
