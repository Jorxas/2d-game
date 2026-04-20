/**
 * Kopiert kenney_pixel-platformer/ → public/kenney_pixel-platformer/
 * und schreibt src/generated/kenneyReady.js (Modus split | tilemap | none).
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

/** Vollständiges Pack mit einzelnen Dateien (klassisches Kenney-ZIP). */
function hasSplitKenneyPack(dir) {
  if (!fs.existsSync(dir)) return false;
  const critical = [
    path.join(dir, "Characters", "character_0000.png"),
    path.join(dir, "Tilesheet", "tilesheet_complete.png"),
    path.join(dir, "Tiles", "tile_0044.png"),
  ];
  return critical.every((p) => fs.existsSync(p));
}

/** „Tilemap“-Pack (häufig bei Tiled + PNG in Tilemap/). */
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
      "[sync-kenney] PNG vorhanden, aber Struktur unbekannt. Entweder das vollständige Pack (Characters/, Tilesheet/, Tiles/) oder mindestens Tilemap/tilemap_packed.png + Tilemap/tilemap-characters_packed.png. Siehe https://kenney.nl/assets/pixel-platformer"
    );
  } else {
    console.log(
      "[sync-kenney] Keine .png in kenney_pixel-platformer/. Pack laden: https://kenney.nl/assets/pixel-platformer"
    );
  }
}

const destMode = packModeOf(dest);
const ready = destMode === "split" || destMode === "tilemap";

fs.mkdirSync(path.dirname(genFile), { recursive: true });
fs.writeFileSync(
  genFile,
  `/** Erzeugt von scripts/sync-kenney.mjs — nicht manuell bearbeiten */\nexport const KENNEY_ASSETS_READY = ${ready};\nexport const KENNEY_PACK_MODE = ${JSON.stringify(destMode)};\n`
);
console.log(`[sync-kenney] KENNEY_ASSETS_READY=${ready} KENNEY_PACK_MODE=${destMode}`);
