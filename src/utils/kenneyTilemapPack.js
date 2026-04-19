import { kenneyUrl } from "../config/assetUrls.js";

/**
 * Pack Kenney « court » : PNG dans Tilemap/ (voir Tiled/*.tsx).
 * tilemap_packed.png = tuiles 18×18, tilemap-characters_packed.png = persos 24×24 (grille 9×3).
 */

export function preloadKenneyTilemapPack(load) {
  load.spritesheet("terrainTiles", kenneyUrl("Tilemap/tilemap_packed.png"), {
    frameWidth: 18,
    frameHeight: 18,
  });
  load.spritesheet("_kenneyCharSheet", kenneyUrl("Tilemap/tilemap-characters_packed.png"), {
    frameWidth: 24,
    frameHeight: 24,
  });
}

/** Indices = numéro des fichiers character_XXXX (feuille 9 colonnes). */
const CHAR_FRAMES = {
  player: 0,
  villager: 2,
  merchant: 3,
  finalSorcerer: 20,
  bossKnight: 21,
  slime: 24,
  enemySlimeGreen: 24,
  enemySlimeViolet: 25,
  enemySlimeAmber: 26,
  bat: 25,
};

/**
 * Découpe chaque frame personnage en texture nommée (comme les PNG séparés du pack complet).
 */
export function extractKenneyCharacterTextures(scene) {
  if (!scene.textures.exists("_kenneyCharSheet")) {
    return;
  }
  const tex = scene.textures.get("_kenneyCharSheet");
  if (!tex || tex.key === "__MISSING") {
    return;
  }
  for (const [key, frameIndex] of Object.entries(CHAR_FRAMES)) {
    extractFrameToTexture(scene, "_kenneyCharSheet", frameIndex, key);
  }
}

function getFrameForIndex(tex, frameIndex) {
  return tex.get(frameIndex) ?? tex.get(String(frameIndex));
}

function frameDimensions(frame) {
  const w = frame.cut?.width ?? frame.realWidth ?? frame.width;
  const h = frame.cut?.height ?? frame.realHeight ?? frame.height;
  if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0) {
    return { w: Math.ceil(w), h: Math.ceil(h) };
  }
  return null;
}

function extractFrameToTexture(scene, sheetKey, frameIndex, newKey) {
  if (scene.textures.exists(newKey)) {
    return;
  }
  const tex = scene.textures.get(sheetKey);
  const frame = getFrameForIndex(tex, frameIndex);
  if (!frame) {
    return;
  }
  const dim = frameDimensions(frame);
  if (!dim) {
    return;
  }
  const { w, h } = dim;
  const rt = scene.make.renderTexture({ width: w, height: h, add: false });
  const stamp = scene.add.image(0, 0, sheetKey, frameIndex);
  stamp.setOrigin(0, 0);
  rt.draw(stamp, 0, 0);
  stamp.destroy();
  rt.saveTexture(newKey);
  rt.destroy();
}
