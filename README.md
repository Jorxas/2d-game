# 2D-Prototyp (Phaser 3)

## Spiel starten (empfohlen)

Im Projektordner (PowerShell oder CMD):

```bash
npm install
npm run dev
```

Oder **Doppelklick** auf `start-game.bat` (Windows).

Das Spiel läuft unter **http://localhost:5173** — Menü und Vollbild funktionieren über **HTTP** (nicht durch Doppelklick auf `index.html`).

---

## Kenney-Assets (nötig für echte Grafiken)

Das Spiel lädt **nur** Dateien aus dem **Pixel Platformer**-Pack von Kenney, mit derselben Ordnerstruktur wie im offiziellen ZIP:

- `Characters/`
- `Tilesheet/`
- `Tiles/`

### Option A — vollständiges Pack (empfohlen)

1. Pack herunterladen: **https://kenney.nl/assets/pixel-platformer** (kostenlos, CC0).
2. Entpacken. Ordner in **`kenney_pixel-platformer`** im Projektstamm umbenennen.
3. Mindestens **`Characters/`**, **`Tilesheet/`**, **`Tiles/`** mit den **PNG**-Dateien (einzelne Bilder).
4. `npm run dev` ausführen: automatische Kopie nach `public/kenney_pixel-platformer/`.

### Option B — nur „Tilemap“-Pack (PNG in `Tilemap/`)

Wenn du vor allem die **Tiled**-Struktur + Ordner **`Tilemap/`** mit hast:

- `Tilemap/tilemap_packed.png`
- `Tilemap/tilemap-characters_packed.png`

…reicht das: Das Spiel lädt sie als **Spritesheets** (Kacheln 18×18, Figuren 24×24) und schneidet die Charaktere automatisch aus. Türen / optionale Effekte werden geladen, wenn du später **`Tilesheet/`** und **`Tiles/`** ergänzt.

### Option C — manuelle Kopie

Pack nach **`public/kenney_pixel-platformer/`** kopieren.

### Wenn PNG fehlen

Der Ordner `kenney_pixel-platformer` soll **nicht** nur `.txt` / Tiled-Dateien enthalten: Es braucht die **echten Ordner mit `.png`** (`Characters`, `Tilesheet`, `Tiles`). Sonst setzt das Skript `KENNEY_ASSETS_READY=false` — das Spiel startet trotzdem mit **generierten** Platzhalter-Texturen (Farben).

---

## Warum nicht nur `index.html` öffnen?

Browser blockieren oft **ES-Module** (`import`) unter `file://`, und **Vollbild** ist eingeschränkt. **`npm run dev`** verwenden.

---

## Nützliche Skripte

| Befehl              | Zweck                                                |
|---------------------|------------------------------------------------------|
| `npm run dev`       | Kenney-Assets synchronisieren, dann Vite            |
| `npm run sync-assets` | Nur `kenney_pixel-platformer` → `public/` kopieren |
| `npm run build`     | Produktions-Build                                    |

---

## Statischer Build (optional)

```bash
npm run build
npm run preview
```
