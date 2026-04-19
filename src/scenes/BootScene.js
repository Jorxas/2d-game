import { kenneyUrl } from "../config/assetUrls.js";
import { KENNEY_ASSETS_READY, KENNEY_PACK_MODE } from "../generated/kenneyReady.js";
import {
  extractKenneyCharacterTextures,
  preloadKenneyTilemapPack,
} from "../utils/kenneyTilemapPack.js";

const TILE_TEX = 18;
const TERRAIN_COLS = 72;
const TERRAIN_ROWS = 48;

/** Textures utilisées par le jeu — si le chargement échoue (404), on génère un substitut. */
const FALLBACK_SPRITES = [
  { key: "player", w: 32, h: 48, color: 0x6ec8ff },
  { key: "slime", w: 36, h: 28, color: 0x7cff9a },
  { key: "enemySlimeGreen", w: 36, h: 28, color: 0x55dd77 },
  { key: "enemySlimeViolet", w: 36, h: 28, color: 0xc77dff },
  { key: "enemySlimeAmber", w: 36, h: 28, color: 0xffcc55 },
  { key: "bat", w: 36, h: 28, color: 0x8899aa },
  { key: "heartIcon", w: 16, h: 16, color: 0xff4466 },
  { key: "swordSlash", w: 24, h: 24, color: 0xeeeeff },
  { key: "fireball", w: 16, h: 16, color: 0xff6600 },
  { key: "iceProjectile", w: 16, h: 16, color: 0x88ddff },
  { key: "dustParticle", w: 8, h: 8, color: 0xcccccc },
  { key: "doorA", w: 32, h: 48, color: 0x8b6914 },
  { key: "doorB", w: 32, h: 48, color: 0x6b4914 },
  { key: "lockedDoor", w: 32, h: 48, color: 0x4a3728 },
  { key: "villager", w: 32, h: 48, color: 0xd4a574 },
  { key: "merchant", w: 32, h: 48, color: 0xffaa66 },
  { key: "bossKnight", w: 48, h: 56, color: 0x8899cc },
  { key: "finalSorcerer", w: 48, h: 56, color: 0xaa66ff },
  { key: "questKey", w: 24, h: 24, color: 0xffdd44 },
  { key: "checkpointStatue", w: 32, h: 48, color: 0x66ccdd },
  { key: "coin", w: 20, h: 20, color: 0xffdd00 },
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    if (!KENNEY_ASSETS_READY) {
      return;
    }

    this.load.on("loaderror", (file) => {
      console.warn(
        "[Boot] Asset manquant ou inaccessible — texture de secours utilisée :",
        file?.key,
        file?.src
      );
    });

    if (KENNEY_PACK_MODE === "tilemap") {
      /** Uniquement les 2 feuilles Tilemap — pas de Tilesheet/Tiles (sinon 404 et erreurs Phaser). */
      preloadKenneyTilemapPack(this.load);
      return;
    }

    this.load.image("player", kenneyUrl("Characters/character_0000.png"));
    this.load.image("slime", kenneyUrl("Characters/character_0024.png"));
    this.load.image("enemySlimeGreen", kenneyUrl("Characters/character_0024.png"));
    this.load.image("enemySlimeViolet", kenneyUrl("Characters/character_0025.png"));
    this.load.image("enemySlimeAmber", kenneyUrl("Characters/character_0026.png"));
    this.load.image("bat", kenneyUrl("Characters/character_0025.png"));
    this.load.image("terrainTiles", kenneyUrl("Tilesheet/tilesheet_complete.png"));
    this.load.image("heartIcon", kenneyUrl("Tiles/tile_0044.png"));
    this.load.image("swordSlash", kenneyUrl("Tilesheet/tile_0106.png"));
    this.load.image("fireball", kenneyUrl("Tilesheet/tile_0004.png"));
    this.load.image("iceProjectile", kenneyUrl("Tilesheet/tile_0005.png"));
    this.load.image("dustParticle", kenneyUrl("Tilesheet/tile_0000.png"));
    this.load.image("doorA", kenneyUrl("Tilesheet/tile_0033.png"));
    this.load.image("doorB", kenneyUrl("Tilesheet/tile_0034.png"));
    this.load.image("lockedDoor", kenneyUrl("Tilesheet/tile_0028.png"));
    this.load.image("villager", kenneyUrl("Characters/character_0002.png"));
    this.load.image("merchant", kenneyUrl("Characters/character_0003.png"));
    this.load.image("bossKnight", kenneyUrl("Characters/character_0021.png"));
    this.load.image("finalSorcerer", kenneyUrl("Characters/character_0020.png"));
    this.load.image("questKey", kenneyUrl("Tilesheet/tile_0027.png"));
    this.load.image("checkpointStatue", kenneyUrl("Tilesheet/tile_0131.png"));
    this.load.image("coin", kenneyUrl("Tilesheet/tile_0151.png"));
  }

  create() {
    if (KENNEY_PACK_MODE === "tilemap") {
      extractKenneyCharacterTextures(this);
    }
    this.ensureFallbackTerrainTilesheet();
    FALLBACK_SPRITES.forEach(({ key, w, h, color }) => {
      this.ensurePlaceholderTexture(key, w, h, color);
    });
    this.scene.start("mainMenu");
  }

  /**
   * Tuiles 18×18 comme dans GameScene — assez grande pour les index utilisés dans les niveaux.
   */
  ensureFallbackTerrainTilesheet() {
    if (this.textures.exists("terrainTiles")) {
      return;
    }
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    for (let ty = 0; ty < TERRAIN_ROWS; ty += 1) {
      for (let tx = 0; tx < TERRAIN_COLS; tx += 1) {
        const c =
          (tx + ty) % 4 === 0
            ? 0x4a6b4a
            : (tx + ty) % 4 === 1
              ? 0x3d5a3d
              : (tx + ty) % 4 === 2
                ? 0x5c7a5c
                : 0x4f6d4f;
        g.fillStyle(c);
        g.fillRect(tx * TILE_TEX, ty * TILE_TEX, TILE_TEX, TILE_TEX);
      }
    }
    g.lineStyle(1, 0x2a3a2a, 0.35);
    for (let x = 0; x <= TERRAIN_COLS; x += 1) {
      g.lineBetween(x * TILE_TEX, 0, x * TILE_TEX, TERRAIN_ROWS * TILE_TEX);
    }
    for (let y = 0; y <= TERRAIN_ROWS; y += 1) {
      g.lineBetween(0, y * TILE_TEX, TERRAIN_COLS * TILE_TEX, y * TILE_TEX);
    }
    const tw = TERRAIN_COLS * TILE_TEX;
    const th = TERRAIN_ROWS * TILE_TEX;
    g.generateTexture("terrainTiles", tw, th);
    g.destroy();
  }

  ensurePlaceholderTexture(key, w, h, color) {
    if (this.textures.exists(key)) {
      return;
    }
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color);
    g.fillRect(0, 0, w, h);
    g.lineStyle(2, 0x000000, 0.6);
    g.strokeRect(1, 1, w - 2, h - 2);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
