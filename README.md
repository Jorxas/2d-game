# Prototype 2D (Phaser 3)

## Commande pour lancer le jeu (recommandé)

Dans le dossier du projet (PowerShell ou CMD) :

```bash
npm install
npm run dev
```

Ou **double-clic** sur `start-game.bat` (Windows).

Le jeu s’ouvre sur **http://localhost:5173** — le menu et le plein écran fonctionnent en **HTTP** (pas en ouvrant `index.html` en double-clic).

---

## Assets Kenney (obligatoire pour les vrais graphismes)

Le jeu charge **uniquement** les fichiers du pack **Pixel Platformer** de Kenney, même arborescence que le ZIP officiel :

- `Characters/`
- `Tilesheet/`
- `Tiles/`

### Option A — pack complet (recommandé)

1. Téléchargez le pack : **https://kenney.nl/assets/pixel-platformer** (gratuit, CC0).
2. Décompressez-le. Renommez le dossier en **`kenney_pixel-platformer`** à la racine du projet.
3. Il doit contenir au minimum **`Characters/`**, **`Tilesheet/`**, **`Tiles/`** avec les **PNG** (fichiers séparés).
4. Lancez `npm run dev` : copie automatique vers `public/kenney_pixel-platformer/`.

### Option B — pack « Tilemap » seulement (PNG dans `Tilemap/`)

Si tu as surtout la structure **Tiled** + dossier **`Tilemap/`** avec :

- `Tilemap/tilemap_packed.png`
- `Tilemap/tilemap-characters_packed.png`

…c’est suffisant : le jeu les charge en **spritesheets** (tuiles 18×18, persos 24×24) et découpe les personnages automatiquement. Les portes / effets optionnels sont chargés si tu ajoutes aussi **`Tilesheet/`** et **`Tiles/`** plus tard.

### Option C — copie manuelle

Copiez le pack dans **`public/kenney_pixel-platformer/`**.

### Si les PNG manquent

Ton dossier `kenney_pixel-platformer` ne doit **pas** se limiter aux fichiers `.txt` / Tiled du pack : il faut les **vrais dossiers avec les `.png`** (`Characters`, `Tilesheet`, `Tiles`). Sans ça, le lanceur met `KENNEY_ASSETS_READY=false` et le jeu démarre quand même avec des **textures générées** (couleurs).

---

## Pourquoi ne pas ouvrir seulement index.html ?

Les navigateurs bloquent souvent les **modules JavaScript** (`import`) en `file://`, et le **plein écran** est limité. Utilisez **`npm run dev`**.

---

## Scripts utiles

| Commande           | Rôle                                      |
|--------------------|-------------------------------------------|
| `npm run dev`      | Synchronise les assets Kenney puis Vite   |
| `npm run sync-assets` | Copie seulement `kenney_pixel-platformer` → `public/` |
| `npm run build`    | Build de production                       |

---

## Build statique (optionnel)

```bash
npm run build
npm run preview
```
