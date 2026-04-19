/**
 * Copie kenney_pixel-platformer/ → public/kenney_pixel-platformer/
 * et écrit src/generated/kenneyReady.js (mode split | tilemap | none).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "kenney_pixel-platformer");
const dest = path.join(root, "public", "kenney_pixel-platformer");
const genFile = path.join(root, "src", "generated", "kenneyReady.js");

function hasPng(dir) {
  if (!fs.existsSync(dir)) return false;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && hasPng(full)) return true;
      if (e.isFile() && e.name.toLowerCase().endsWith(".png")) return true;
    }
  } catch {
    return false;
  }
  return false;
}

/** Pack complet avec fichiers séparés (ZIP Kenney classique). */
function hasSplitKenneyPack(dir) {
  if (!fs.existsSync(dir)) return false;
  const critical = [
    path.join(dir, "Characters", "character_0000.png"),
    path.join(dir, "Tilesheet", "tilesheet_complete.png"),
    path.join(dir, "Tiles", "tile_0044.png"),
  ];
  return critical.every((p) => fs.existsSync(p));
}

/** Pack « Tilemap » (souvent ce que tu as avec Tiled + PNG dans Tilemap/). */
function hasTilemapKenneyPack(dir) {
  if (!fs.existsSync(dir)) return false;
  const a = path.join(dir, "Tilemap", "tilemap_packed.png");
  const b = path.join(dir, "Tilemap", "tilemap-characters_packed.png");
  return fs.existsSync(a) && fs.existsSync(b);
}

function packModeOf(dir) {
  if (hasSplitKenneyPack(dir)) return "split";
  if (hasTilemapKenneyPack(dir)) return "tilemap";
  return "none";
}

const srcMode = fs.existsSync(src) ? packModeOf(src) : "none";

if (fs.existsSync(src) && (srcMode === "split" || srcMode === "tilemap")) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`[sync-kenney] Pack copié (${srcMode}) → public/kenney_pixel-platformer/`);
} else if (fs.existsSync(src)) {
  if (hasPng(src)) {
    console.log(
      "[sync-kenney] PNG présents mais structure non reconnue. Il faut soit le pack complet (Characters/, Tilesheet/, Tiles/), soit au minimum Tilemap/tilemap_packed.png + Tilemap/tilemap-characters_packed.png. Voir https://kenney.nl/assets/pixel-platformer"
    );
  } else {
    console.log(
      "[sync-kenney] Aucun .png dans kenney_pixel-platformer/. Télécharge le pack sur https://kenney.nl/assets/pixel-platformer"
    );
  }
}

const destMode = packModeOf(dest);
const ready = destMode === "split" || destMode === "tilemap";

fs.mkdirSync(path.dirname(genFile), { recursive: true });
fs.writeFileSync(
  genFile,
  `/** Généré par scripts/sync-kenney.mjs — ne pas éditer à la main */\nexport const KENNEY_ASSETS_READY = ${ready};\nexport const KENNEY_PACK_MODE = ${JSON.stringify(destMode)};\n`
);
console.log(`[sync-kenney] KENNEY_ASSETS_READY=${ready} KENNEY_PACK_MODE=${destMode}`);
