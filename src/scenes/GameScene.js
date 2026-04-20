import { Player } from "../entities/Player.js";
import { Slime } from "../entities/Slime.js";
import { BossKnight } from "../entities/BossKnight.js";
import { BossGolem } from "../entities/BossGolem.js";
import { Bat } from "../entities/Bat.js";
import { Spitter } from "../entities/Spitter.js";
import { FinalSorcerer } from "../entities/FinalSorcerer.js";
import { SorcererShadow } from "../entities/SorcererShadow.js";
import {
  ICE_AIR_DRAG,
  ICE_GROUND_DRAG,
  PLAYER_ICE_FREEZE_MS,
  PLAYER_KNOCKBACK_X,
  PLAYER_KNOCKBACK_Y,
  SHOP_HEAL_POTION_COST,
  SHOP_ICE_SPELL_COST,
  SHOP_MANA_RING_COST,
  XP_GEM_VALUE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../config/constants.js";
import { SAVE_KEY, defaultStoryFlags } from "../config/save.js";
import { ZONES, getZoneWidth } from "../data/zones.js";
import { createControls, isIceSpellJustPressed, isSpellJustPressed } from "../utils/input.js";
import { toggleGameFullscreen } from "../utils/fullscreen.js";
import { KENNEY_PACK_MODE } from "../generated/kenneyReady.js";

const TILE_SIZE = 18;
/** Aus tilemap_packed (Spritesheet) geschnittene Kacheln: kein Abstand zwischen Frames. tilesheet_complete: 1 px Kenney-Zwischenraum. */
const TERRAIN_TILE_SPACING = KENNEY_PACK_MODE === "split" ? 1 : 0;
const EDGE_THRESHOLD = 8;

const GRASS_LEFT = 21;
const GRASS_MID = 22;
const GRASS_RIGHT = 23;
const DIRT_LEFT = 121;
const DIRT_MID = 122;
const DIRT_RIGHT = 123;

export class GameScene extends Phaser.Scene {
  constructor() {
    super("game");
  }

  init(data) {
    this.startData = data ?? {};
  }

  create() {
    const maxZoneW = Math.max(
      ...Object.values(ZONES).map((z) => getZoneWidth(z))
    );
    this.physics.world.setBounds(0, 0, maxZoneW, WORLD_HEIGHT);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.input.setDefaultCursor("none");
    this.fullscreenKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.F
    );
    this.fullscreenAltKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.P
    );
    this.debugTeleportKeys = this.input.keyboard.addKeys({
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      four: Phaser.Input.Keyboard.KeyCodes.FOUR,
      five: Phaser.Input.Keyboard.KeyCodes.FIVE,
      six: Phaser.Input.Keyboard.KeyCodes.SIX,
      seven: Phaser.Input.Keyboard.KeyCodes.SEVEN,
      eight: Phaser.Input.Keyboard.KeyCodes.EIGHT,
      nine: Phaser.Input.Keyboard.KeyCodes.NINE,
      zero: Phaser.Input.Keyboard.KeyCodes.ZERO,
      minus: Phaser.Input.Keyboard.KeyCodes.MINUS,
    });

    this.createParallaxTextures();
    this.createParticleSystem();

    this.fireballs = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.iceProjectiles = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.xpGems = this.add.group();
    this.coins = this.add.group();
    this.sorcererFireballs = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.bats = this.physics.add.group();
    this.spitters = this.physics.add.group();
    this.spitterShots = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.movingPlatformGroup = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    this.storyFlags = { ...defaultStoryFlags() };
    this.teleporterSprites = [];
    this.puzzleStatueSprites = [];
    this.zoneWindZones = [];
    this.zoneIceZones = [];

    this.player = new Player(this, 120, WORLD_HEIGHT - 200);
    this.controls = createControls(this);
    this.activeDoor = null;
    this.activeNpc = null;
    this.activeMerchant = null;
    this.activeChest = null;
    this.activeLevelUpIndex = 0;
    this.pendingLevelUpChoices = 0;
    this.isLevelUpMenuOpen = false;
    this.isJournalOpen = false;
    this.zoneColliders = [];
    this.hasQuestKey = false;
    this.hasLegendarySword = false;
    this.gold = 0;
    this.isShopOpen = false;
    this.activeShopIndex = 0;
    this.dialogueTimer = null;
    this.boss = null;
    this.finalBoss = null;
    this.sorcererShadows = this.add.group();
    this.bossDefeatedZones = new Set();
    this.finalBossDefeated = false;
    this.isGameOver = false;
    this.isVictory = false;
    this.isTransitioning = false;
    this.isEndingCinematic = false;

    this.savedCheckpoint = {
      zoneId: "zone1",
      x: ZONES.zone1.defaultSpawn.x,
      y: ZONES.zone1.defaultSpawn.y,
    };

    this.initAudioSystem();
    this.setupWebAudioUnlock();
    this.levelUpInputKeys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
    this.shopInputKeys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
    });
    this.journalToggleKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.Q
    );
    this.setupCamera();
    this.addHud();
    this.addControlsHint();
    this.addFullscreenButton();
    this.loadProgressFromStartData();

    // Temporärer Testmodus: Ressourcen für schnelles Debugging freigeschaltet.
    this.gold = 999999;
    this.hasQuestKey = true;
    this.hasLegendarySword = true;
    this.player.unlockIceSpell();

    this.switchZone(this.savedCheckpoint.zoneId, {
      x: this.savedCheckpoint.x,
      y: this.savedCheckpoint.y,
    });
  }

  update(time, delta) {
    this.handleFullscreenToggle();
    this.handleDebugTeleports();
    this.handleJournalToggle();

    if (this.isGameOver || this.isVictory || this.isEndingCinematic) {
      this.updateHud();
      return;
    }

    if (this.isJournalOpen) {
      this.updateHud();
      this.updateParallax();
      return;
    }

    if (this.isShopOpen) {
      this.handleShopMenuInput();
      this.updateHud();
      this.updateParallax();
      return;
    }

    if (this.isLevelUpMenuOpen) {
      this.handleLevelUpMenuInput();
      this.updateHud();
      this.updateParallax();
      return;
    }

    if (this.isTransitioning) {
      this.updateHud();
      this.updateParallax();
      return;
    }

    this.activeDoor = null;
    this.activeNpc = null;
    this.activeMerchant = null;
    this.activeChest = null;
    if (this.doors) {
      this.physics.overlap(this.player, this.doors, (_player, door) => {
        this.activeDoor = door;
      });
    }
    if (this.npcs) {
      this.physics.overlap(this.player, this.npcs, (_player, npc) => {
        this.activeNpc = npc;
        if (npc.npcType === "merchant") {
          this.activeMerchant = npc;
        }
      });
    }
    if (this.specialChests) {
      this.physics.overlap(this.player, this.specialChests, (_player, chest) => {
        this.activeChest = chest;
      });
    }

    if (this.tryInteractWithNpc()) {
      this.updateParallax();
      this.updateHud();
      this.updateDoorPrompt();
      this.updateNpcPrompt();
      this.updateChestPrompt();
      this.updateMerchantPrompt();
      return;
    }
    if (this.tryOpenMerchantShop()) {
      this.updateParallax();
      this.updateHud();
      this.updateDoorPrompt();
      this.updateNpcPrompt();
      this.updateChestPrompt();
      this.updateMerchantPrompt();
      return;
    }

    if (this.tryEnterDoor()) {
      this.updateParallax();
      this.updateHud();
      this.updateDoorPrompt();
      this.updateNpcPrompt();
      this.updateChestPrompt();
      return;
    }
    if (this.tryOpenChest()) {
      this.updateParallax();
      this.updateHud();
      this.updateDoorPrompt();
      this.updateNpcPrompt();
      this.updateChestPrompt();
      return;
    }

    this.player.update(this.controls, time, delta);

    if (this.slimes) {
      this.slimes.getChildren().forEach((slime) => slime.update(time));
    }
    if (this.bats) {
      this.bats.getChildren().forEach((bat) => bat.update(time));
    }
    if (this.spitters) {
      this.spitters.getChildren().forEach((sp) => sp.update(time));
    }
    this.updateMovingPlatforms();
    this.applyWindAndIceForces(delta);
    this.handleTeleportersAndPuzzle();
    if (this.boss && this.boss.active) {
      this.boss.update(time, this.player.x);
      if (
        this.boss instanceof BossKnight &&
        !this.boss.didSummonAtHalf &&
        this.boss.hp <= this.boss.maxHp * 0.5
      ) {
        this.boss.didSummonAtHalf = true;
        this.onBossSummon(this.boss);
      }
    }
    if (this.finalBoss && this.finalBoss.active) {
      this.finalBoss.update(time, this.player);
    }
    if (this.sorcererShadows) {
      this.sorcererShadows.getChildren().forEach((shadow) => shadow.update(this.player));
    }

    this.handleFireballCast(time);
    this.handleIceSpellCast(time);
    this.handleZoneBoundaries();
    this.handleVoidFall();
    this.checkGameOver();
    this.updateParallax();
    this.updateHud();
    this.updateDoorPrompt();
    this.updateNpcPrompt();
    this.updateChestPrompt();
    this.updateMerchantPrompt();
    this.updateMinimap();
    this.updateQuestArrow();
  }

  switchZone(zoneId, spawnOverride = null) {
    const zone = ZONES[zoneId];
    if (!zone) {
      return;
    }

    this.currentZoneId = zoneId;
    this.currentZone = zone;
    this.currentZoneWidth = getZoneWidth(zone);
    this.physics.world.setBounds(0, 0, this.currentZoneWidth, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, this.currentZoneWidth, WORLD_HEIGHT);
    this.resetZoneRuntime();
    this.createParallaxForZone(zone);
    this.createTileWorld(zone);
    this.createZoneDoors(zone);
    this.createZoneNpcs(zone);
    this.createZoneQuestItems(zone);
    this.createZoneCheckpoints(zone);
    this.createZoneSlimes(zone);
    this.createZoneBats(zone);
    this.createZoneSpitters(zone);
    this.createMovingPlatforms(zone);
    this.setupZoneWindAndIce(zone);
    this.setupTeleporters(zone);
    this.setupPuzzleStatues(zone);
    this.setupDarkOverlay(zone);
    this.setupSwitchPlates(zone);
    this.createZoneBoss(zone);
    this.bindZonePhysics();

    const spawn = spawnOverride ?? zone.defaultSpawn;
    this.player.setPosition(spawn.x, spawn.y);
    this.player.body.setVelocity(0, 0);
    this.player.body.setAcceleration(0, 0);
    this.player.jumpCount = 0;

    this.cameras.main.setBackgroundColor(zone.backgroundColor);
    this.zoneNameText.setText(zone.name);
    if (zone.id === "castle") {
      this.castleDustBackdrop = this.add
        .tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, "dustParticle")
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-10)
        .setTint(0x6f55a5)
        .setAlpha(0.25);
    }
    this.playBackgroundMusicForCurrentZone();
  }

  startFadeTransition(callback, duration = 220, fadeIn = true) {
    if (this.isTransitioning) {
      return false;
    }

    this.isTransitioning = true;
    this.cameras.main.fadeOut(duration, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        callback();

        if (!fadeIn) {
          this.isTransitioning = false;
          return;
        }

        this.cameras.main.fadeIn(duration, 0, 0, 0);
        this.cameras.main.once(
          Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,
          () => {
            this.isTransitioning = false;
          }
        );
      }
    );

    return true;
  }

  transitionToZone(zoneId, spawn) {
    this.startFadeTransition(() => {
      this.switchZone(zoneId, spawn);
    });
  }

  loadProgressFromStartData() {
    if (!this.startData?.continueFromSave || !this.startData.saveData) {
      return;
    }

    const saveData = this.startData.saveData;
    const zoneId = saveData.zoneId;
    if (!zoneId || !ZONES[zoneId]) {
      return;
    }

    this.savedCheckpoint = {
      zoneId,
      x: saveData.checkpointX ?? ZONES[zoneId].defaultSpawn.x,
      y: saveData.checkpointY ?? ZONES[zoneId].defaultSpawn.y,
    };
    this.hasQuestKey = !!saveData.hasQuestKey;
    this.hasLegendarySword = !!saveData.hasLegendarySword;
    this.gold = saveData.gold ?? this.gold;
    this.player.loadProgressData(saveData.playerProgress);
    this.player.restoreVitals();
    this.bossDefeatedZones = new Set(saveData.bossDefeatedZones ?? []);
    this.finalBossDefeated = !!saveData.finalBossDefeated;
    this.storyFlags = {
      ...defaultStoryFlags(),
      ...(saveData.storyFlags ?? {}),
    };
  }

  buildSaveData() {
    return {
      zoneId: this.savedCheckpoint.zoneId,
      checkpointX: this.savedCheckpoint.x,
      checkpointY: this.savedCheckpoint.y,
      hasQuestKey: this.hasQuestKey,
      hasLegendarySword: this.hasLegendarySword,
      gold: this.gold,
      playerProgress: this.player.toProgressData(),
      bossDefeatedZones: Array.from(this.bossDefeatedZones),
      finalBossDefeated: this.finalBossDefeated,
      storyFlags: { ...this.storyFlags },
    };
  }

  saveProgress() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.buildSaveData()));
    } catch (_error) {
      // Speicherfehler ignorieren (Privatmodus oder Kontingent).
    }
  }

  resetZoneRuntime() {
    this.zoneColliders.forEach((collider) => collider.destroy());
    this.zoneColliders = [];

    if (this.tilemap) {
      this.solidLayer?.destroy();
      this.oneWayLayer?.destroy();
      this.tilemap.destroy();
      this.tilemap = null;
    }

    this.castleDustBackdrop?.destroy();
    this.castleDustBackdrop = null;

    this.xpGems.clear(true, true);
    this.coins.clear(true, true);
    this.fireballs.clear(true, true);
    this.iceProjectiles.clear(true, true);
    this.sorcererFireballs.clear(true, true);

    if (this.slimes) {
      this.slimes.clear(true, true);
    } else {
      this.slimes = this.add.group();
    }

    if (this.doors) {
      this.doors.clear(true, true);
    } else {
      this.doors = this.physics.add.staticGroup();
    }

    if (this.checkpoints) {
      this.checkpoints.clear(true, true);
    } else {
      this.checkpoints = this.physics.add.staticGroup();
    }

    if (this.npcs) {
      this.npcs.getChildren().forEach((npc) => npc.prompt?.destroy());
      this.npcs.clear(true, true);
    } else {
      this.npcs = this.physics.add.staticGroup();
    }

    if (this.questItems) {
      this.questItems.clear(true, true);
    } else {
      this.questItems = this.physics.add.staticGroup();
    }

    if (this.specialChests) {
      this.specialChests.clear(true, true);
    } else {
      this.specialChests = this.physics.add.staticGroup();
    }

    if (this.boss) {
      this.boss.destroy();
      this.boss = null;
    }

    if (this.finalBoss) {
      this.finalBoss.destroy();
      this.finalBoss = null;
    }

    if (this.sorcererShadows) {
      this.sorcererShadows.clear(true, true);
    }

    this.bats?.clear(true, true);
    this.spitters?.clear(true, true);
    this.spitterShots?.clear(true, true);
    this.movingPlatformGroup?.clear(true, true);
    this.darkOverlay?.destroy();
    this.darkOverlay = null;
    this.teleporterSprites?.forEach((t) => t.destroy?.());
    this.teleporterSprites = [];
    this.puzzleStatueSprites?.forEach((s) => s.destroy?.());
    this.puzzleStatueSprites = [];
    this.zoneWindZones = [];
    this.zoneIceZones = [];
    if (this.switchPlateGroup) {
      this.switchPlateGroup.clear(true, true);
    }

    this.activeDoor = null;
    this.activeNpc = null;
    this.activeMerchant = null;
  }

  createParallaxTextures() {
    if (!this.textures.exists("parallax-far")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 256, 128);
      g.fillStyle(0xffffff, 1);
      for (let i = 0; i < 25; i += 1) {
        g.fillCircle(
          Phaser.Math.Between(0, 255),
          Phaser.Math.Between(0, 127),
          Phaser.Math.Between(1, 2)
        );
      }
      g.generateTexture("parallax-far", 256, 128);
      g.destroy();
    }

    if (!this.textures.exists("parallax-near")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 256, 128);
      g.fillStyle(0xffffff, 1);
      for (let i = 0; i < 12; i += 1) {
        const x = i * 24;
        const h = Phaser.Math.Between(16, 36);
        g.fillTriangle(x, 128, x + 10, 128 - h, x + 20, 128);
      }
      g.generateTexture("parallax-near", 256, 128);
      g.destroy();
    }
  }

  createParallaxForZone(zone) {
    this.parallaxFar?.destroy();
    this.parallaxNear?.destroy();

    this.parallaxFar = this.add
      .tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, "parallax-far")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-30)
      .setTint(zone.parallaxFarTint);

    this.parallaxNear = this.add
      .tileSprite(
        0,
        this.cameras.main.height * 0.35,
        this.cameras.main.width,
        this.cameras.main.height * 0.65,
        "parallax-near"
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-20)
      .setTint(zone.parallaxNearTint)
      .setAlpha(0.9);
  }

  updateParallax() {
    if (!this.parallaxFar || !this.parallaxNear) {
      return;
    }

    const cam = this.cameras.main;
    this.parallaxFar.setSize(cam.width, cam.height);
    this.parallaxNear.setSize(cam.width, cam.height * 0.65);
    this.parallaxNear.setPosition(0, cam.height * 0.35);

    this.parallaxFar.tilePositionX = cam.scrollX * 0.12;
    this.parallaxFar.tilePositionY = cam.scrollY * 0.04;
    this.parallaxNear.tilePositionX = cam.scrollX * 0.28;
    this.parallaxNear.tilePositionY = cam.scrollY * 0.08;

    if (this.castleDustBackdrop) {
      this.castleDustBackdrop.setSize(cam.width, cam.height);
      this.castleDustBackdrop.tilePositionX = cam.scrollX * 0.18;
      this.castleDustBackdrop.tilePositionY = cam.scrollY * 0.1;
    }
  }

  createTileWorld(zone) {
    const mapWidth = Math.floor(this.currentZoneWidth / TILE_SIZE);
    const mapHeight = Math.floor(WORLD_HEIGHT / TILE_SIZE);

    this.tilemap = this.make.tilemap({
      width: mapWidth,
      height: mapHeight,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    const tileset = this.tilemap.addTilesetImage(
      "terrainTiles",
      "terrainTiles",
      TILE_SIZE,
      TILE_SIZE,
      0,
      TERRAIN_TILE_SPACING
    );

    this.solidLayer = this.tilemap.createBlankLayer("solid", tileset);
    this.oneWayLayer = this.tilemap.createBlankLayer("oneWay", tileset);

    const groundTopRow = mapHeight - 3;
    for (let x = 0; x < mapWidth; x += 1) {
      if (this.isInsideHole(x, zone.holes)) {
        continue;
      }

      const leftEdge = this.isInsideHole(x - 1, zone.holes);
      const rightEdge = this.isInsideHole(x + 1, zone.holes);
      this.placeGroundColumn(x, groundTopRow, leftEdge, rightEdge, mapHeight);
    }

    zone.platforms.forEach(([startX, y, width]) =>
      this.placeSolidPlatform(startX, y, width)
    );
    zone.oneWays.forEach(([startX, y, width]) =>
      this.placeOneWayPlatform(startX, y, width)
    );

    this.solidLayer.setCollisionByExclusion([-1], true);
    this.oneWayLayer.setCollisionByExclusion([-1], true);
  }

  isInsideHole(x, holes) {
    return holes.some(([from, to]) => x >= from && x <= to);
  }

  placeGroundColumn(x, topY, leftEdge, rightEdge, mapHeight) {
    let topTile = GRASS_MID;
    if (leftEdge) {
      topTile = GRASS_LEFT;
    } else if (rightEdge) {
      topTile = GRASS_RIGHT;
    }

    this.solidLayer.putTileAt(topTile, x, topY);

    for (let y = topY + 1; y < mapHeight; y += 1) {
      let dirtTile = DIRT_MID;
      if (leftEdge) {
        dirtTile = DIRT_LEFT;
      } else if (rightEdge) {
        dirtTile = DIRT_RIGHT;
      }
      this.solidLayer.putTileAt(dirtTile, x, y);
    }
  }

  placeSolidPlatform(startX, y, width) {
    for (let i = 0; i < width; i += 1) {
      const tileX = startX + i;
      let tileIndex = GRASS_MID;
      if (i === 0) {
        tileIndex = GRASS_LEFT;
      } else if (i === width - 1) {
        tileIndex = GRASS_RIGHT;
      }
      this.solidLayer.putTileAt(tileIndex, tileX, y);
      this.solidLayer.putTileAt(DIRT_MID, tileX, y + 1);
    }
  }

  placeOneWayPlatform(startX, y, width) {
    for (let i = 0; i < width; i += 1) {
      const tileX = startX + i;
      let tileIndex = GRASS_MID;
      if (i === 0) {
        tileIndex = GRASS_LEFT;
      } else if (i === width - 1) {
        tileIndex = GRASS_RIGHT;
      }
      this.oneWayLayer.putTileAt(tileIndex, tileX, y);
    }
  }

  createZoneDoors(zone) {
    zone.doors.forEach((door) => {
      const sprite = this.doors
        .create(door.x, door.y, door.texture)
        .setDepth(6)
        .setScale(1.3);
      sprite.refreshBody();
      sprite.targetZone = door.targetZone;
      sprite.targetSpawn = door.targetSpawn;
      sprite.requiresKey = !!door.requiresKey;
      sprite.requiresLegendarySword = !!door.requiresLegendarySword;
      sprite.requiresStoryFlag = door.requiresStoryFlag ?? null;
      sprite.lockedMessage = door.lockedMessage ?? "Verschlossen...";
    });
  }

  createZoneNpcs(zone) {
    zone.npcs.forEach((npcData) => {
      const texture = npcData.type === "merchant" ? "merchant" : "villager";
      const npc = this.npcs
        .create(npcData.x, npcData.y, texture)
        .setDepth(6)
        .setScale(1.5);
      npc.refreshBody();
      npc.dialogue = npcData.dialogue;
      npc.npcType = npcData.type ?? "villager";
      npc.prompt = this.add
        .text(npc.x, npc.y - 42, npc.npcType === "merchant" ? "$" : "!", {
          fontFamily: "Courier New",
          fontSize: "22px",
          color: "#ffe17a",
          fontStyle: "bold",
          stroke: "#4a2d00",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(8)
        .setVisible(false);
    });
  }

  createZoneQuestItems(zone) {
    zone.questItems.forEach((itemData) => {
      if (itemData.type === "key" && this.hasQuestKey) {
        return;
      }

      const item = this.questItems
        .create(itemData.x, itemData.y, "questKey")
        .setDepth(6)
        .setScale(1.35);
      item.refreshBody();
      item.questType = itemData.type;
    });
  }

  createZoneCheckpoints(zone) {
    zone.checkpoints.forEach((point) => {
      const checkpoint = this.checkpoints
        .create(point.x, point.y, "checkpointStatue")
        .setDepth(6)
        .setScale(1.4);
      checkpoint.refreshBody();
      checkpoint.respawnPoint = { x: point.x, y: point.y - 90 };
      checkpoint.zoneId = zone.id;

      const isActive =
        this.savedCheckpoint.zoneId === zone.id &&
        Math.abs(this.savedCheckpoint.x - checkpoint.respawnPoint.x) < 2 &&
        Math.abs(this.savedCheckpoint.y - checkpoint.respawnPoint.y) < 2;
      checkpoint.setTint(isActive ? 0x7bf6ff : 0x8e94a7);
      checkpoint.isActive = isActive;
    });
  }

  createZoneSlimes(zone) {
    const variantCycle = ["green", "violet", "amber"];
    (zone.slimes ?? []).forEach((item, index) => {
      const variant = item.variant ?? variantCycle[index % variantCycle.length];
      const slime = new Slime(this, item.x, item.y, item.patrolDistance, {
        variant,
        maxHp: item.maxHp,
      });
      this.slimes.add(slime);
    });
  }

  createZoneBats(zone) {
    (zone.bats ?? []).forEach((b) => {
      const bat = new Bat(this, b.x, b.y, { amp: b.amp, speed: b.speed });
      this.bats.add(bat);
    });
  }

  createZoneSpitters(zone) {
    (zone.spitters ?? []).forEach((s) => {
      const sp = new Spitter(this, s.x, s.y, s.patrolDistance ?? 70);
      this.spitters.add(sp);
    });
  }

  createMovingPlatforms(zone) {
    (zone.movingPlatforms ?? []).forEach((mp) => {
      const px = mp.tileX * TILE_SIZE + (mp.width * TILE_SIZE) / 2;
      const py = mp.y;
      const w = mp.width * TILE_SIZE;
      const rect = this.add
        .rectangle(px, py, w, 14, 0x5f8f6a, 0.95)
        .setDepth(4);
      this.physics.add.existing(rect, false);
      rect.body.setAllowGravity(false);
      rect.body.setImmovable(true);
      rect.body.setVelocityX(52);
      rect.body.setSize(w, 14);
      rect.mpMinX = px - mp.range * 0.5;
      rect.mpMaxX = px + mp.range * 0.5;
      this.movingPlatformGroup.add(rect);
    });
  }

  setupZoneWindAndIce(zone) {
    this.zoneWindZones = zone.windZones ?? [];
    this.zoneIceZones = zone.iceZones ?? [];
  }

  setupTeleporters(zone) {
    (zone.teleporters ?? []).forEach((tp, i) => {
      const g = this.add
        .rectangle(tp.x, tp.y, 48, 64, 0x6c5ce7, 0.45)
        .setDepth(5);
      g.setData("tpIndex", i);
      g.setData("targetX", tp.targetX);
      g.setData("targetY", tp.targetY);
      this.teleporterSprites.push(g);
    });
  }

  setupPuzzleStatues(zone) {
    (zone.puzzleStatues ?? []).forEach((st) => {
      const s = this.add
        .text(st.x, st.y - 40, st.label, {
          fontFamily: "Courier New",
          fontSize: "22px",
          color: "#ffeaa7",
          backgroundColor: "#00000088",
          padding: { x: 6, y: 4 },
        })
        .setOrigin(0.5)
        .setDepth(6);
      s.setData("statueId", st.id);
      s.setData("orderIndex", st.orderIndex);
      this.puzzleStatueSprites.push(s);
    });
  }

  setupDarkOverlay(zone) {
    if (!zone.darkLevel) {
      return;
    }
    this.darkOverlay = this.add
      .rectangle(
        0,
        0,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        0.58
      )
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(400)
      .setInteractive(false);
  }

  setupSwitchPlates(zone) {
    if (!this.switchPlateGroup) {
      this.switchPlateGroup = this.physics.add.staticGroup();
    }
    this.switchPlateGroup.clear(true, true);
    (zone.switches ?? []).forEach((sw) => {
      const w = sw.w ?? 56;
      const h = sw.h ?? 28;
      const done = !!this.storyFlags[sw.id];
      const plate = this.add
        .rectangle(sw.x, sw.y, w, h, done ? 0x55ff88 : 0xc8b88a, 0.88)
        .setDepth(3);
      this.physics.add.existing(plate, true);
      if (plate.body && typeof plate.body.updateFromGameObject === "function") {
        plate.body.updateFromGameObject();
      }
      plate.switchId = sw.id;
      this.switchPlateGroup.add(plate);
    });
  }

  createZoneBoss(zone) {
    this.boss = null;
    this.finalBoss = null;
    this.setBossHudVisible(false);

    if (zone.finalBoss) {
      if (this.finalBossDefeated) {
        return;
      }

      this.finalBoss = new FinalSorcerer(this, zone.finalBoss.x, zone.finalBoss.y);
      this.setBossHudVisible(true, "Thronzauberer");
      return;
    }

    if (!zone.boss) {
      return;
    }

    if (this.bossDefeatedZones.has(zone.id)) {
      this.spawnBossRewardChest(zone.boss.chestSpawn.x, zone.boss.chestSpawn.y);
      return;
    }

    const bType = zone.boss.type ?? "knight";
    if (bType === "golem") {
      this.boss = new BossGolem(this, zone.boss.x, zone.boss.y);
      this.boss.body.setVelocityX(-40);
      this.setBossHudVisible(true, "Steingolem");
    } else {
      this.boss = new BossKnight(this, zone.boss.x, zone.boss.y);
      this.boss.body.setVelocityX(-45);
      this.setBossHudVisible(true, "Großer Ritter");
    }
  }

  bindZonePhysics() {
    const colliders = [
      this.physics.add.collider(this.player, this.solidLayer),
      this.physics.add.collider(
        this.player,
        this.oneWayLayer,
        null,
        this.processOneWayTileCollision,
        this
      ),
      this.physics.add.collider(this.slimes, this.solidLayer),
      this.physics.add.collider(this.xpGems, this.solidLayer),
      this.physics.add.collider(this.coins, this.solidLayer),
      this.physics.add.collider(
        this.fireballs,
        this.solidLayer,
        this.handleFireballWallHit,
        null,
        this
      ),
      this.physics.add.collider(
        this.iceProjectiles,
        this.solidLayer,
        this.handleIceProjectileWallHit,
        null,
        this
      ),
      this.physics.add.collider(
        this.sorcererFireballs,
        this.solidLayer,
        this.handleSorcererFireballWallHit,
        null,
        this
      ),
      this.physics.add.collider(this.sorcererShadows, this.solidLayer),
      this.physics.add.overlap(
        this.player,
        this.slimes,
        this.handlePlayerSlimeTouch,
        null,
        this
      ),
      this.physics.add.overlap(
        this.player.attackHitbox,
        this.slimes,
        this.handlePlayerAttackHit,
        this.processAttackHit,
        this
      ),
      this.physics.add.overlap(
        this.fireballs,
        this.slimes,
        this.handleFireballSlimeHit,
        null,
        this
      ),
      this.physics.add.overlap(
        this.iceProjectiles,
        this.slimes,
        this.handleIceProjectileSlimeHit,
        null,
        this
      ),
      this.physics.add.overlap(
        this.player,
        this.xpGems,
        this.handleGemPickup,
        null,
        this
      ),
      this.physics.add.overlap(
        this.player,
        this.coins,
        this.handleCoinPickup,
        null,
        this
      ),
      this.physics.add.overlap(
        this.player,
        this.sorcererShadows,
        this.handlePlayerShadowTouch,
        null,
        this
      ),
      this.physics.add.overlap(
        this.player,
        this.sorcererFireballs,
        this.handleSorcererFireballPlayerHit,
        null,
        this
      ),
      this.physics.add.overlap(
        this.player,
        this.checkpoints,
        this.handleCheckpointTouch,
        null,
        this
      ),
      this.physics.add.overlap(
        this.player,
        this.questItems,
        this.handleQuestItemPickup,
        null,
        this
      ),
      this.physics.add.collider(this.bats, this.solidLayer),
      this.physics.add.collider(this.spitters, this.solidLayer),
      this.physics.add.collider(this.movingPlatformGroup, this.solidLayer),
      this.physics.add.collider(this.player, this.movingPlatformGroup),
      this.physics.add.overlap(
        this.player,
        this.bats,
        this.handlePlayerBatTouch,
        null,
        this
      ),
      this.physics.add.overlap(
        this.player.attackHitbox,
        this.bats,
        this.handlePlayerAttackBatHit,
        this.processAttackHit,
        this
      ),
      this.physics.add.overlap(
        this.fireballs,
        this.bats,
        this.handleFireballBatHit,
        null,
        this
      ),
      this.physics.add.overlap(
        this.iceProjectiles,
        this.bats,
        this.handleIceProjectileBatHit,
        null,
        this
      ),
      this.physics.add.overlap(
        this.player,
        this.spitters,
        this.handlePlayerSpitterTouch,
        null,
        this
      ),
      this.physics.add.overlap(
        this.player.attackHitbox,
        this.spitters,
        this.handlePlayerAttackSpitterHit,
        this.processAttackHit,
        this
      ),
      this.physics.add.overlap(
        this.fireballs,
        this.spitters,
        this.handleFireballSpitterHit,
        null,
        this
      ),
      this.physics.add.overlap(
        this.iceProjectiles,
        this.spitters,
        this.handleIceProjectileSpitterHit,
        null,
        this
      ),
      this.physics.add.overlap(
        this.player,
        this.spitterShots,
        this.handleSpitterShotPlayerHit,
        null,
        this
      )
    ];

    if (this.switchPlateGroup && (this.currentZone?.switches?.length ?? 0) > 0) {
      colliders.push(
        this.physics.add.overlap(
          this.player,
          this.switchPlateGroup,
          this.handleSwitchPlateOverlap,
          null,
          this
        )
      );
    }

    if (this.boss) {
      colliders.push(
        this.physics.add.collider(this.boss, this.solidLayer),
        this.physics.add.overlap(
          this.player,
          this.boss,
          this.handlePlayerBossTouch,
          null,
          this
        ),
        this.physics.add.overlap(
          this.player.attackHitbox,
          this.boss,
          this.handlePlayerAttackBossHit,
          this.processAttackHit,
          this
        ),
        this.physics.add.overlap(
          this.fireballs,
          this.boss,
          this.handleFireballBossHit,
          null,
          this
        ),
        this.physics.add.overlap(
          this.iceProjectiles,
          this.boss,
          this.handleIceProjectileBossHit,
          null,
          this
        )
      );
    }

    if (this.finalBoss) {
      colliders.push(
        this.physics.add.collider(this.finalBoss, this.solidLayer),
        this.physics.add.overlap(
          this.player,
          this.finalBoss,
          this.handlePlayerFinalBossTouch,
          null,
          this
        ),
        this.physics.add.overlap(
          this.player.attackHitbox,
          this.finalBoss,
          this.handlePlayerAttackFinalBossHit,
          this.processAttackHit,
          this
        ),
        this.physics.add.overlap(
          this.fireballs,
          this.finalBoss,
          this.handleFireballFinalBossHit,
          null,
          this
        ),
        this.physics.add.overlap(
          this.iceProjectiles,
          this.finalBoss,
          this.handleIceProjectileFinalBossHit,
          null,
          this
        ),
        this.physics.add.overlap(
          this.player.attackHitbox,
          this.sorcererShadows,
          this.handlePlayerAttackShadowHit,
          this.processAttackHit,
          this
        ),
        this.physics.add.overlap(
          this.fireballs,
          this.sorcererShadows,
          this.handleFireballShadowHit,
          null,
          this
        ),
        this.physics.add.overlap(
          this.iceProjectiles,
          this.sorcererShadows,
          this.handleIceProjectileShadowHit,
          null,
          this
        )
      );
    }

    this.zoneColliders.push(...colliders);
  }

  processOneWayTileCollision(player, tile) {
    if (!tile) {
      return false;
    }

    const playerBody = player.body;
    const tileTop = tile.pixelY;
    const previousBottom = playerBody.prev.y + playerBody.height;
    const verticalTolerance = 2;

    if (playerBody.velocity.y < 0) {
      return false;
    }

    return previousBottom <= tileTop + verticalTolerance;
  }

  handleSwitchPlateOverlap(_player, plate) {
    const id = plate.switchId;
    if (!id || this.storyFlags[id]) {
      return;
    }
    this.storyFlags[id] = true;
    plate.setFillStyle(0x55ff88, 0.9);
    this.saveProgress();
  }

  tryEnterDoor() {
    if (!this.activeDoor) {
      return false;
    }

    if (!Phaser.Input.Keyboard.JustDown(this.controls.up)) {
      return false;
    }

    if (this.activeDoor.requiresKey && !this.hasQuestKey) {
      this.showDialogue(this.activeDoor.lockedMessage, 1800);
      return true;
    }
    if (this.activeDoor.requiresLegendarySword && !this.hasLegendarySword) {
      this.showDialogue(this.activeDoor.lockedMessage, 1800);
      return true;
    }
    if (
      this.activeDoor.requiresStoryFlag &&
      !this.storyFlags[this.activeDoor.requiresStoryFlag]
    ) {
      this.showDialogue(this.activeDoor.lockedMessage, 1800);
      return true;
    }

    this.transitionToZone(this.activeDoor.targetZone, this.activeDoor.targetSpawn);
    return true;
  }

  tryInteractWithNpc() {
    if (!this.activeNpc) {
      return false;
    }

    if (this.activeNpc.npcType === "merchant") {
      return false;
    }

    if (!Phaser.Input.Keyboard.JustDown(this.controls.up)) {
      return false;
    }

    this.showDialogue(this.activeNpc.dialogue, 3600);
    return true;
  }

  tryOpenMerchantShop() {
    if (!this.activeMerchant) {
      return false;
    }

    if (!Phaser.Input.Keyboard.JustDown(this.controls.up)) {
      return false;
    }

    this.openShopMenu();
    return true;
  }

  tryOpenChest() {
    if (!this.activeChest) {
      return false;
    }

    if (!Phaser.Input.Keyboard.JustDown(this.controls.up)) {
      return false;
    }

    this.activeChest.destroy();
    this.hasLegendarySword = true;
    this.showDialogue("Das legendäre Schwert gehört dir. Das Schloss ist jetzt offen!", 2800);
    this.saveProgress();
    return true;
  }

  handleZoneBoundaries() {
    const zw = this.currentZoneWidth ?? WORLD_WIDTH;
    if (this.player.x >= zw - EDGE_THRESHOLD && this.currentZone.rightZone) {
      const nextZone = ZONES[this.currentZone.rightZone];
      this.transitionToZone(this.currentZone.rightZone, nextZone.entryFromLeft);
      return;
    }

    if (this.player.x <= EDGE_THRESHOLD && this.currentZone.leftZone) {
      const previousZone = ZONES[this.currentZone.leftZone];
      this.transitionToZone(this.currentZone.leftZone, previousZone.entryFromRight);
    }
  }

  handleVoidFall() {
    if (this.player.y <= WORLD_HEIGHT + 120) {
      return;
    }

    if (this.currentZoneId !== this.savedCheckpoint.zoneId) {
      this.transitionToZone(this.savedCheckpoint.zoneId, {
        x: this.savedCheckpoint.x,
        y: this.savedCheckpoint.y,
      });
      return;
    }

    this.startFadeTransition(() => {
      this.player.setPosition(this.savedCheckpoint.x, this.savedCheckpoint.y);
      this.player.body.setVelocity(0, 0);
      this.player.body.setAcceleration(0, 0);
      this.player.jumpCount = 0;
    });
  }

  checkGameOver() {
    if (this.player.getHp() > 0 || this.isGameOver || this.isVictory) {
      return;
    }

    this.isGameOver = true;
    this.startFadeTransition(() => {
      this.physics.world.pause();
      this.showGameOverScreen();
    }, 240, false);
  }

  handleCheckpointTouch(a, b) {
    const pair = this.pickPlayerAndOther(a, b);
    if (!pair || !this.checkpoints.contains(pair.other)) {
      return;
    }
    const checkpoint = pair.other;

    if (checkpoint.isActive) {
      return;
    }

    this.checkpoints.getChildren().forEach((item) => {
      item.isActive = false;
      item.setTint(0x8e94a7);
    });

    checkpoint.isActive = true;
    checkpoint.setTint(0x7bf6ff);
    this.savedCheckpoint = {
      zoneId: checkpoint.zoneId,
      x: checkpoint.respawnPoint.x,
      y: checkpoint.respawnPoint.y,
    };
    this.saveProgress();
  }

  handleQuestItemPickup(a, b) {
    const pair = this.pickPlayerAndOther(a, b);
    if (!pair || !this.questItems.contains(pair.other)) {
      return;
    }
    const item = pair.other;

    if (!item.active) {
      return;
    }

    if (item.questType === "key") {
      this.hasQuestKey = true;
      this.showDialogue("Du hast den Schlüssel zur Höhle gefunden!", 2200);
      this.keyInventoryIcon.setAlpha(1);
      this.keyInventoryLabel.setText("SCHL");
      this.saveProgress();
    }

    item.destroy();
  }

  createParticleSystem() {
    if (!this.textures.exists("hit-particle")) {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0xfff2a8, 1);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture("hit-particle", 8, 8);
      graphics.destroy();
    }

    this.hitEmitter = this.add.particles(0, 0, "hit-particle", {
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 120, max: 280 },
      scale: { start: 0.9, end: 0 },
      gravityY: 520,
      quantity: 10,
      on: false,
    });

    this.dustEmitter = this.add.particles(0, 0, "dustParticle", {
      speed: { min: 20, max: 110 },
      angle: { min: 210, max: 330 },
      lifespan: { min: 180, max: 380 },
      scale: { start: 0.45, end: 0 },
      gravityY: 900,
      quantity: 8,
      tint: [0xdddddd, 0xb0b0b0, 0x888888],
      on: false,
    });
  }

  /**
   * Phaser Arcade kann die beiden gameObjects der Überlappung in beliebiger Reihenfolge
   * liefern (body1/body2). Spieler / Trefferbox / Gruppe immer explizit auflösen.
   */
  pickPlayerAndOther(a, b) {
    if (a === this.player) {
      return { player: a, other: b };
    }
    if (b === this.player) {
      return { player: b, other: a };
    }
    return null;
  }

  pickAttackHitboxAndOther(a, b) {
    const hb = this.player?.attackHitbox;
    if (!hb) {
      return null;
    }
    if (a === hb) {
      return { other: b };
    }
    if (b === hb) {
      return { other: a };
    }
    return null;
  }

  handlePlayerAttackHit(a, b) {
    const hb = this.pickAttackHitboxAndOther(a, b);
    if (!hb || !(hb.other instanceof Slime)) {
      return;
    }
    const slime = hb.other;
    if (!slime.active || slime.isDying) {
      return;
    }

    const knockbackX = (this.player.x < slime.x ? 1 : -1) * 190;
    this.safeApplyDamageToSlime(slime, this.player.getDamage(), knockbackX);
  }

  processAttackHit() {
    return this.player.isAttacking;
  }

  handlePlayerSlimeTouch(a, b) {
    const pair = this.pickPlayerAndOther(a, b);
    if (!pair || !(pair.other instanceof Slime)) {
      return;
    }
    const { player, other: slime } = pair;

    const now = this.time.now;
    if (!player.canTakeDamage(now)) {
      return;
    }

    player.takeDamage(1);
    player.registerDamageTime(now);
    this.flashSpriteWhite(player, 110);
    this.cameras.main.shake(200, 0.006);
    const horizontalDirection = player.x < slime.x ? -1 : 1;
    player.body.setVelocityX(horizontalDirection * PLAYER_KNOCKBACK_X);
    player.body.setVelocityY(PLAYER_KNOCKBACK_Y);
  }

  handleFireballCast(time) {
    if (!isSpellJustPressed(this.controls)) {
      return;
    }

    if (!this.player.consumeManaForFireball(time)) {
      return;
    }

    const direction = this.player.facing;
    const fireball = this.fireballs
      .create(this.player.x + direction * 26, this.player.y - 6, "fireball")
      .setDepth(7);
    fireball.setDisplaySize(24, 24);
    fireball.setBlendMode(Phaser.BlendModes.ADD);
    fireball.setTint(0xffaa44);
    fireball.body.setAllowGravity(false);
    fireball.body.setSize(18, 18);
    fireball.setVelocityX(direction * this.player.getFireballSpeed());
    fireball.setVelocityY(0);
    fireball.setFlipX(direction < 0);
    fireball.damage = Math.max(1, this.player.getDamage());

    this.tweens.add({
      targets: fireball,
      angle: direction * 360,
      duration: 520,
      repeat: -1,
      ease: "Linear",
    });

    this.time.delayedCall(1500, () => {
      if (fireball.active) {
        this.spawnHitImpact(fireball.x, fireball.y);
        fireball.destroy();
      }
    });
  }

  handleIceSpellCast(time) {
    if (!isIceSpellJustPressed(this.controls)) {
      return;
    }

    if (!this.player.consumeManaForIceSpell(time)) {
      return;
    }

    const direction = this.player.facing;
    const projectile = this.iceProjectiles
      .create(this.player.x + direction * 26, this.player.y - 6, "iceProjectile")
      .setDepth(7);
    projectile.setDisplaySize(22, 22);
    projectile.setBlendMode(Phaser.BlendModes.SCREEN);
    projectile.setTint(0xa8f0ff);
    projectile.body.setAllowGravity(false);
    projectile.body.setSize(18, 18);
    projectile.setVelocityX(direction * this.player.getIceSpeed());
    projectile.setVelocityY(0);
    projectile.setFlipX(direction < 0);
    projectile.freezeDuration = PLAYER_ICE_FREEZE_MS;

    this.tweens.add({
      targets: projectile,
      angle: direction * -280,
      duration: 640,
      repeat: -1,
      ease: "Linear",
    });

    this.time.delayedCall(1500, () => {
      if (projectile.active) {
        this.spawnHitImpact(projectile.x, projectile.y);
        projectile.destroy();
      }
    });
  }

  handleFireballWallHit(a, b) {
    const fireball = this.fireballs.contains(a)
      ? a
      : this.fireballs.contains(b)
        ? b
        : null;
    if (!fireball?.active) {
      return;
    }
    this.spawnHitImpact(fireball.x, fireball.y);
    fireball.destroy();
  }

  handleIceProjectileWallHit(a, b) {
    const projectile = this.iceProjectiles.contains(a)
      ? a
      : this.iceProjectiles.contains(b)
        ? b
        : null;
    if (!projectile?.active) {
      return;
    }
    this.spawnHitImpact(projectile.x, projectile.y);
    projectile.destroy();
  }

  handleFireballSlimeHit(a, b) {
    const slime = a instanceof Slime ? a : b instanceof Slime ? b : null;
    const fireball = slime === a ? b : a;
    if (!fireball?.active || !slime?.active || slime.isDying) {
      return;
    }

    const knockbackX = fireball.body && fireball.body.velocity.x >= 0 ? 220 : -220;
    this.safeApplyDamageToSlime(slime, fireball.damage ?? this.player.getDamage(), knockbackX);
    if (fireball.active) {
      fireball.destroy();
    }
  }

  handleIceProjectileSlimeHit(a, b) {
    const slime = a instanceof Slime ? a : b instanceof Slime ? b : null;
    const projectile = slime === a ? b : a;
    if (!projectile.active || !slime.active || slime.isDying) {
      return;
    }

    slime.freeze(this.time.now, projectile.freezeDuration ?? PLAYER_ICE_FREEZE_MS);
    this.spawnHitImpact(projectile.x, projectile.y);
    projectile.destroy();
  }

  handlePlayerBatTouch(a, b) {
    const pair = this.pickPlayerAndOther(a, b);
    if (!pair || !(pair.other instanceof Bat)) {
      return;
    }
    const { player, other: bat } = pair;
    if (!bat.active || bat.isDying) {
      return;
    }
    const now = this.time.now;
    if (!player.canTakeDamage(now)) {
      return;
    }
    player.takeDamage(1);
    player.registerDamageTime(now);
    this.flashSpriteWhite(player, 100);
    this.cameras.main.shake(150, 0.005);
    const dir = player.x < bat.x ? -1 : 1;
    player.body.setVelocityX(dir * PLAYER_KNOCKBACK_X);
    player.body.setVelocityY(PLAYER_KNOCKBACK_Y * 0.6);
  }

  handlePlayerAttackBatHit(a, b) {
    const hb = this.pickAttackHitboxAndOther(a, b);
    if (!hb || !(hb.other instanceof Bat)) {
      return;
    }
    const bat = hb.other;
    if (!bat.active || bat.isDying) {
      return;
    }
    this.applyDamageToBat(bat, this.player.getDamage(), 180);
  }

  handleFireballBatHit(a, b) {
    const bat = a instanceof Bat ? a : b instanceof Bat ? b : null;
    const fireball = bat === a ? b : a;
    if (!fireball?.active || !bat?.active || bat.isDying) {
      return;
    }
    const knockbackX = fireball.body && fireball.body.velocity.x >= 0 ? 200 : -200;
    this.applyDamageToBat(bat, fireball.damage ?? this.player.getDamage(), knockbackX);
    if (fireball.active) {
      fireball.destroy();
    }
  }

  handleIceProjectileBatHit(a, b) {
    const bat = a instanceof Bat ? a : b instanceof Bat ? b : null;
    const projectile = bat === a ? b : a;
    if (!projectile.active || !bat?.active || bat.isDying) {
      return;
    }
    this.applyDamageToBat(bat, 1, 0);
    this.spawnHitImpact(projectile.x, projectile.y);
    projectile.destroy();
  }

  applyDamageToBat(bat, damage, knockbackX) {
    const dead = bat.takeHit(damage);
    this.flashSpriteWhite(bat, 80);
    if (knockbackX) {
      bat.body.setVelocityX(knockbackX);
    }
    this.spawnHitImpact(bat.x, bat.y);
    if (!dead) {
      return;
    }
    bat.isDying = true;
    bat.body.enable = false;
    this.time.delayedCall(120, () => {
      if (bat.active) {
        this.spawnXpGem(bat.x, bat.y);
        bat.destroy();
      }
    });
  }

  handlePlayerSpitterTouch(a, b) {
    const pair = this.pickPlayerAndOther(a, b);
    if (!pair || !(pair.other instanceof Spitter)) {
      return;
    }
    const { player, other: sp } = pair;
    if (!sp.active || sp.isDying) {
      return;
    }
    const now = this.time.now;
    if (!player.canTakeDamage(now)) {
      return;
    }
    player.takeDamage(1);
    player.registerDamageTime(now);
    this.flashSpriteWhite(player, 100);
    const dir = player.x < sp.x ? -1 : 1;
    player.body.setVelocityX(dir * PLAYER_KNOCKBACK_X);
    player.body.setVelocityY(PLAYER_KNOCKBACK_Y * 0.5);
  }

  handlePlayerAttackSpitterHit(a, b) {
    const hb = this.pickAttackHitboxAndOther(a, b);
    if (!hb || !(hb.other instanceof Spitter)) {
      return;
    }
    const sp = hb.other;
    if (!sp.active || sp.isDying) {
      return;
    }
    this.applyDamageToSpitter(sp, this.player.getDamage(), 160);
  }

  handleFireballSpitterHit(a, b) {
    const sp = a instanceof Spitter ? a : b instanceof Spitter ? b : null;
    const fireball = sp === a ? b : a;
    if (!fireball?.active || !sp?.active || sp.isDying) {
      return;
    }
    const knockbackX = fireball.body && fireball.body.velocity.x >= 0 ? 200 : -200;
    this.applyDamageToSpitter(sp, fireball.damage ?? this.player.getDamage(), knockbackX);
    if (fireball.active) {
      fireball.destroy();
    }
  }

  handleIceProjectileSpitterHit(a, b) {
    const sp = a instanceof Spitter ? a : b instanceof Spitter ? b : null;
    const projectile = sp === a ? b : a;
    if (!projectile.active || !sp?.active || sp.isDying) {
      return;
    }
    sp.freeze(this.time.now, PLAYER_ICE_FREEZE_MS);
    this.spawnHitImpact(projectile.x, projectile.y);
    projectile.destroy();
  }

  applyDamageToSpitter(sp, damage, knockbackX) {
    const dead = sp.takeHit(damage);
    this.flashSpriteWhite(sp, 90);
    if (knockbackX) {
      sp.body.setVelocityX(knockbackX);
    }
    this.spawnHitImpact(sp.x, sp.y);
    if (!dead) {
      return;
    }
    sp.isDying = true;
    sp.body.enable = false;
    this.time.delayedCall(150, () => {
      if (sp.active) {
        this.spawnXpGem(sp.x, sp.y);
        sp.destroy();
      }
    });
  }

  handleSpitterShotPlayerHit(a, b) {
    const pair = this.pickPlayerAndOther(a, b);
    if (!pair) {
      return;
    }
    const shot = pair.other;
    if (!this.spitterShots.contains(shot)) {
      return;
    }
    const { player } = pair;
    if (!shot.active) {
      return;
    }
    const now = this.time.now;
    if (player.canTakeDamage(now)) {
      player.takeDamage(shot.damage ?? 1);
      player.registerDamageTime(now);
      this.flashSpriteWhite(player, 90);
    }
    shot.destroy();
  }

  onSpitterShoot(spitter) {
    if (!spitter.active || spitter.isDying) {
      return;
    }
    const shot = this.spitterShots
      .create(spitter.x, spitter.y - 12, "fireball")
      .setDepth(7);
    shot.setDisplaySize(14, 14);
    shot.setTint(0xff66aa);
    shot.body.setAllowGravity(false);
    shot.body.setSize(12, 12);
    const ang = Phaser.Math.Angle.Between(
      spitter.x,
      spitter.y,
      this.player.x,
      this.player.y
    );
    const spd = 190;
    shot.body.setVelocity(Math.cos(ang) * spd, Math.sin(ang) * spd);
    shot.damage = 1;
    this.time.delayedCall(3500, () => {
      if (shot.active) {
        shot.destroy();
      }
    });
  }

  updateMovingPlatforms() {
    if (!this.movingPlatformGroup) {
      return;
    }
    this.movingPlatformGroup.getChildren().forEach((p) => {
      if (!p.body || p.mpMinX === undefined) {
        return;
      }
      const vx = p.body.velocity.x;
      if (p.x <= p.mpMinX) {
        p.body.setVelocityX(Math.abs(vx) || 52);
      } else if (p.x >= p.mpMaxX) {
        p.body.setVelocityX(-(Math.abs(vx) || 52));
      }
    });
  }

  applyWindAndIceForces(delta) {
    const px = this.player.x;
    const py = this.player.y;
    this.zoneWindZones.forEach((z) => {
      if (
        px >= z.x &&
        px <= z.x + z.w &&
        py >= z.y &&
        py <= z.y + z.h
      ) {
        this.player.body.setVelocityX(
          this.player.body.velocity.x + (z.force * delta) / 1000
        );
      }
    });
    this.playerOnIce = false;
    this.zoneIceZones.forEach((z) => {
      if (
        px >= z.x &&
        px <= z.x + z.w &&
        py >= z.y - 80 &&
        py <= z.y + z.h
      ) {
        this.playerOnIce = true;
        this.player.body.setVelocityX(this.player.body.velocity.x * 1.015);
      }
    });
  }

  handleTeleportersAndPuzzle() {
    this.teleporterSprites.forEach((tp) => {
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        tp.x,
        tp.y
      );
      if (d < 44 && Phaser.Input.Keyboard.JustDown(this.controls.up)) {
        this.player.setPosition(tp.getData("targetX"), tp.getData("targetY"));
        this.player.body.setVelocity(0, 0);
        this.cameras.main.flash(200, 0, 0, 0, false);
      }
    });

    if (
      this.currentZone?.puzzleStatues?.length &&
      (this.currentZone.puzzleOrder?.length ?? 0) > 0 &&
      !this.storyFlags.ruinsPuzzleSolved &&
      Phaser.Input.Keyboard.JustDown(this.controls.up)
    ) {
      let nearest = null;
      let bestD = 99999;
      this.puzzleStatueSprites.forEach((st) => {
        const d = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          st.x,
          st.y + 20
        );
        if (d < 72 && d < bestD) {
          bestD = d;
          nearest = st;
        }
      });
      if (nearest) {
        const id = nearest.getData("statueId");
        this.storyFlags.puzzleSequence = this.storyFlags.puzzleSequence ?? [];
        this.storyFlags.puzzleSequence.push(id);
        const order = this.currentZone.puzzleOrder;
        const seq = this.storyFlags.puzzleSequence;
        let ok = true;
        for (let i = 0; i < seq.length; i += 1) {
          if (seq[i] !== order[i]) {
            ok = false;
            break;
          }
        }
        if (!ok) {
          this.storyFlags.puzzleSequence = [];
          this.showDialogue("Die Runen verblassen...", 1600);
        } else if (seq.length === order.length) {
          this.storyFlags.ruinsPuzzleSolved = true;
          this.showDialogue("Die Ruinen öffnen sich! Ein Durchgang erscheint.", 2400);
          this.saveProgress();
        }
      }
    }
  }

  handlePlayerBossTouch(a, b) {
    const pair = this.pickPlayerAndOther(a, b);
    if (!pair || pair.other !== this.boss) {
      return;
    }
    const { player, other: boss } = pair;

    if (!boss.active || boss.isDead) {
      return;
    }

    const now = this.time.now;
    if (!player.canTakeDamage(now)) {
      return;
    }

    player.takeDamage(2);
    player.registerDamageTime(now);
    this.flashSpriteWhite(player, 120);
    this.cameras.main.shake(200, 0.007);
    const horizontalDirection = player.x < boss.x ? -1 : 1;
    player.body.setVelocityX(horizontalDirection * (PLAYER_KNOCKBACK_X + 70));
    player.body.setVelocityY(PLAYER_KNOCKBACK_Y);
  }

  handlePlayerAttackBossHit(a, b) {
    const hb = this.pickAttackHitboxAndOther(a, b);
    if (!hb || hb.other !== this.boss) {
      return;
    }
    const boss = hb.other;
    if (!boss.active || boss.isDead) {
      return;
    }

    const knockbackX = (this.player.x < boss.x ? 1 : -1) * 120;
    this.applyDamageToBoss(boss, this.player.getDamage(), knockbackX);
  }

  handleFireballBossHit(a, b) {
    const boss = this.boss;
    if (!boss) {
      return;
    }
    let fireball;
    if (a === boss && this.fireballs.contains(b)) {
      fireball = b;
    } else if (b === boss && this.fireballs.contains(a)) {
      fireball = a;
    } else {
      return;
    }

    if (!fireball.active || !boss.active || boss.isDead) {
      return;
    }

    const vx = fireball.body ? fireball.body.velocity.x : 0;
    const knockbackX = vx >= 0 ? 150 : -150;
    this.applyDamageToBoss(
      boss,
      fireball.damage ?? this.player.getDamage(),
      knockbackX
    );
    fireball.destroy();
  }

  handleIceProjectileBossHit(a, b) {
    const boss = this.boss;
    if (!boss) {
      return;
    }
    let projectile;
    if (a === boss && this.iceProjectiles.contains(b)) {
      projectile = b;
    } else if (b === boss && this.iceProjectiles.contains(a)) {
      projectile = a;
    } else {
      return;
    }

    if (!projectile.active || !boss.active || boss.isDead) {
      return;
    }

    boss.freeze(this.time.now, projectile.freezeDuration ?? PLAYER_ICE_FREEZE_MS);
    this.spawnHitImpact(projectile.x, projectile.y);
    projectile.destroy();
  }

  handlePlayerFinalBossTouch(a, b) {
    const pair = this.pickPlayerAndOther(a, b);
    if (!pair || pair.other !== this.finalBoss) {
      return;
    }
    const { player, other: boss } = pair;

    if (!boss.active || boss.isDead) {
      return;
    }

    const now = this.time.now;
    if (!player.canTakeDamage(now)) {
      return;
    }

    player.takeDamage(2);
    player.registerDamageTime(now);
    this.flashSpriteWhite(player, 120);
    this.cameras.main.shake(200, 0.008);
    const direction = player.x < boss.x ? -1 : 1;
    player.body.setVelocityX(direction * (PLAYER_KNOCKBACK_X + 90));
    player.body.setVelocityY(PLAYER_KNOCKBACK_Y - 20);
  }

  handlePlayerAttackFinalBossHit(a, b) {
    const hb = this.pickAttackHitboxAndOther(a, b);
    if (!hb || hb.other !== this.finalBoss) {
      return;
    }
    const boss = hb.other;
    if (!boss.active || boss.isDead) {
      return;
    }

    const didDie = boss.takeHit(this.player.getDamage());
    this.flashSpriteWhite(boss, 100);
    this.spawnHitImpact(boss.x, boss.y - 50);

    if (didDie) {
      this.killFinalBoss(boss);
    }
  }

  handleFireballFinalBossHit(a, b) {
    const boss = this.finalBoss;
    if (!boss) {
      return;
    }
    let fireball;
    if (a === boss && this.fireballs.contains(b)) {
      fireball = b;
    } else if (b === boss && this.fireballs.contains(a)) {
      fireball = a;
    } else {
      return;
    }

    if (!fireball.active || !boss.active || boss.isDead) {
      return;
    }

    const didDie = boss.takeHit(fireball.damage ?? this.player.getDamage());
    this.flashSpriteWhite(boss, 100);
    this.spawnHitImpact(fireball.x, fireball.y);
    fireball.destroy();

    if (didDie) {
      this.killFinalBoss(boss);
    }
  }

  handleIceProjectileFinalBossHit(a, b) {
    const boss = this.finalBoss;
    if (!boss) {
      return;
    }
    let projectile;
    if (a === boss && this.iceProjectiles.contains(b)) {
      projectile = b;
    } else if (b === boss && this.iceProjectiles.contains(a)) {
      projectile = a;
    } else {
      return;
    }

    if (!projectile.active || !boss.active || boss.isDead) {
      return;
    }

    // Endboss ist widerstandsfähig: Eis wirkt nur als kurzer visueller Treffer-Stun.
    boss.body.setVelocityX(0);
    this.flashSpriteWhite(boss, 120);
    this.spawnHitImpact(projectile.x, projectile.y);
    projectile.destroy();
  }

  handlePlayerShadowTouch(a, b) {
    const pair = this.pickPlayerAndOther(a, b);
    if (!pair || !(pair.other instanceof SorcererShadow)) {
      return;
    }
    const { player, other: shadow } = pair;

    if (!shadow.active || shadow.isDying) {
      return;
    }

    const now = this.time.now;
    if (!player.canTakeDamage(now)) {
      return;
    }

    player.takeDamage(1);
    player.registerDamageTime(now);
    this.flashSpriteWhite(player, 100);
    const direction = player.x < shadow.x ? -1 : 1;
    player.body.setVelocityX(direction * PLAYER_KNOCKBACK_X);
    player.body.setVelocityY(PLAYER_KNOCKBACK_Y);
  }

  handlePlayerAttackShadowHit(a, b) {
    const hb = this.pickAttackHitboxAndOther(a, b);
    if (!hb || !(hb.other instanceof SorcererShadow)) {
      return;
    }
    const shadow = hb.other;
    if (!shadow.active || shadow.isDying) {
      return;
    }
    const didDie = shadow.takeHit(this.player.getDamage());
    this.spawnHitImpact(shadow.x, shadow.y - 20);
    if (didDie) {
      shadow.isDying = true;
      shadow.body.enable = false;
      this.time.delayedCall(120, () => {
        if (!shadow.active) {
          return;
        }
        this.spawnXpGem(shadow.x, shadow.y);
        shadow.destroy();
      });
    }
  }

  handleFireballShadowHit(a, b) {
    let fireball;
    let shadow;
    if (this.fireballs.contains(a) && b instanceof SorcererShadow) {
      fireball = a;
      shadow = b;
    } else if (this.fireballs.contains(b) && a instanceof SorcererShadow) {
      fireball = b;
      shadow = a;
    } else {
      return;
    }

    if (!fireball.active || !shadow.active || shadow.isDying) {
      return;
    }
    const didDie = shadow.takeHit(fireball.damage ?? this.player.getDamage());
    this.spawnHitImpact(fireball.x, fireball.y);
    fireball.destroy();
    if (didDie) {
      shadow.isDying = true;
      shadow.body.enable = false;
      this.time.delayedCall(100, () => {
        if (shadow.active) {
          shadow.destroy();
        }
      });
    }
  }

  handleIceProjectileShadowHit(a, b) {
    let projectile;
    let shadow;
    if (this.iceProjectiles.contains(a) && b instanceof SorcererShadow) {
      projectile = a;
      shadow = b;
    } else if (this.iceProjectiles.contains(b) && a instanceof SorcererShadow) {
      projectile = b;
      shadow = a;
    } else {
      return;
    }

    if (!projectile.active || !shadow.active || shadow.isDying) {
      return;
    }
    const didDie = shadow.takeHit(99);
    this.spawnHitImpact(projectile.x, projectile.y);
    projectile.destroy();
    if (didDie && shadow.active) {
      shadow.destroy();
    }
  }

  spawnFinalBossFireball(boss, player) {
    if (!boss.active || boss.isDead) {
      return;
    }

    const projectile = this.sorcererFireballs
      .create(boss.x, boss.y - 40, "fireball")
      .setDepth(8)
      .setTint(0xff62e6);
    projectile.setDisplaySize(22, 22);
    projectile.setBlendMode(Phaser.BlendModes.ADD);
    projectile.body.setAllowGravity(false);
    projectile.body.setSize(16, 16);

    const angle = Phaser.Math.Angle.Between(boss.x, boss.y - 40, player.x, player.y - 20);
    const speed = boss.phase === 3 ? 320 : boss.phase === 2 ? 270 : 230;
    projectile.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    projectile.damage = boss.phase === 3 ? 2 : 1;

    this.tweens.add({
      targets: projectile,
      angle: 360,
      duration: 300,
      repeat: -1,
      ease: "Linear",
    });

    this.time.delayedCall(2200, () => {
      if (projectile.active) {
        projectile.destroy();
      }
    });
  }

  handleSorcererFireballWallHit(a, b) {
    const projectile = this.sorcererFireballs.contains(a)
      ? a
      : this.sorcererFireballs.contains(b)
        ? b
        : null;
    if (!projectile?.active) {
      return;
    }
    this.spawnHitImpact(projectile.x, projectile.y);
    projectile.destroy();
  }

  handleSorcererFireballPlayerHit(a, b) {
    const pair = this.pickPlayerAndOther(a, b);
    if (!pair) {
      return;
    }
    const projectile = pair.other;
    if (!this.sorcererFireballs.contains(projectile)) {
      return;
    }
    const { player } = pair;

    if (!projectile.active) {
      return;
    }

    const now = this.time.now;
    if (player.canTakeDamage(now)) {
      player.takeDamage(projectile.damage ?? 1);
      player.registerDamageTime(now);
      this.flashSpriteWhite(player, 110);
      this.cameras.main.shake(200, 0.007);
    }
    this.spawnHitImpact(projectile.x, projectile.y);
    projectile.destroy();
  }

  onFinalBossSummonShadows(boss) {
    const positions = [
      { x: boss.x - 180, y: boss.y - 10 },
      { x: boss.x + 180, y: boss.y - 10 },
      { x: boss.x, y: boss.y - 10 },
    ];

    positions.forEach((pos) => {
      const shadow = new SorcererShadow(this, pos.x, pos.y);
      this.sorcererShadows.add(shadow);
    });
  }

  killFinalBoss(boss) {
    if (this.finalBossDefeated) {
      return;
    }

    this.finalBossDefeated = true;
    boss.isDead = true;
    boss.body.enable = false;
    boss.setTint(0xfff2aa);
    this.playSfx("bossDeathCry");
    this.stopBackgroundMusic();

    this.spawnGoldRain(boss.x, boss.y - 50);
    for (let i = 0; i < 20; i += 1) {
      this.time.delayedCall(i * 30, () => this.spawnCoin(boss.x, boss.y - 20));
    }

    this.time.delayedCall(500, () => {
      if (boss.active) {
        boss.destroy();
      }
      this.setBossHudVisible(false);
      this.startEndingCinematic();
    });
  }

  applyDamageToBoss(boss, damage, knockbackX) {
    const didDie = boss.takeHit(damage);
    this.flashSpriteWhite(boss, 100);
    boss.body.setVelocityX(knockbackX);
    this.spawnHitImpact(boss.x, boss.y - 40);

    if (!didDie) {
      return;
    }

    this.killBoss(boss);
  }

  killBoss(boss) {
    boss.isDead = true;
    boss.body.enable = false;
    boss.setTint(0xffd98b);
    this.playSfx("bossDeathCry");
    this.bossDefeatedZones.add(this.currentZoneId);
    this.playBackgroundMusicForCurrentZone();
    this.saveProgress();
    this.applySlowMotion(2000, 0.33);
    this.spawnGoldRain(boss.x, boss.y - 40);
    for (let i = 0; i < 12; i += 1) {
      this.time.delayedCall(i * 35, () => this.spawnCoin(boss.x, boss.y - 10));
    }

    const chestX = this.currentZone.boss?.chestSpawn?.x ?? boss.x + 40;
    const chestY = this.currentZone.boss?.chestSpawn?.y ?? boss.y;
    this.time.delayedCall(280, () => {
      if (boss.active) {
        boss.destroy();
      }
      this.setBossHudVisible(false);
      this.spawnBossRewardChest(chestX, chestY);
    });
  }

  onBossSlam(boss) {
    this.cameras.main.shake(200, 0.01);
    this.spawnHitImpact(boss.x, boss.y - 20);
    this.spawnHitImpact(boss.x - 20, boss.y - 18);
    this.spawnHitImpact(boss.x + 20, boss.y - 18);

    const distance = Math.abs(this.player.x - boss.x);
    if (distance < 240 && this.player.y > boss.y - 100) {
      const now = this.time.now;
      if (this.player.canTakeDamage(now)) {
        this.player.takeDamage(1);
        this.player.registerDamageTime(now);
        this.flashSpriteWhite(this.player, 110);
        const dir = this.player.x < boss.x ? -1 : 1;
        this.player.body.setVelocityX(dir * (PLAYER_KNOCKBACK_X + 30));
        this.player.body.setVelocityY(PLAYER_KNOCKBACK_Y - 50);
      }
    }
  }

  onBossSummon(boss) {
    const positions = [
      { x: boss.x - 90, y: boss.y - 10 },
      { x: boss.x + 90, y: boss.y - 10 },
    ];

    const summonVariants = ["green", "violet", "amber"];
    positions.forEach((pos, i) => {
      const slime = new Slime(this, pos.x, pos.y, 70, {
        variant: summonVariants[i % summonVariants.length],
      });
      this.slimes.add(slime);
    });
  }

  spawnGoldRain(x, y) {
    for (let i = 0; i < 12; i += 1) {
      this.time.delayedCall(i * 40, () => {
        const gem = this.add.circle(
          x + Phaser.Math.Between(-40, 40),
          y + Phaser.Math.Between(-15, 15),
          6,
          0xffd447
        );
        this.physics.add.existing(gem);
        this.xpGems.add(gem);
        gem.body.setBounce(0.3);
        gem.body.setDragX(220);
        gem.body.setVelocity(
          Phaser.Math.Between(-120, 120),
          Phaser.Math.Between(-260, -130)
        );
      });
    }
  }

  applySlowMotion(durationMs = 2000, timeScale = 0.35) {
    this.time.timeScale = timeScale;
    this.physics.world.timeScale = timeScale;

    window.setTimeout(() => {
      if (!this.scene.isActive()) {
        return;
      }
      this.time.timeScale = 1;
      this.physics.world.timeScale = 1;
    }, durationMs);
  }

  spawnBossRewardChest(x, y) {
    const chest = this.specialChests
      .create(x, y, "lockedDoor")
      .setDepth(7)
      .setScale(1.4);
    chest.setTint(0xffd76e);
    chest.refreshBody();
    chest.chestType = "legendary";
  }

  applyDamageToSlime(slime, damage, knockbackX) {
    const now = this.time.now;
    const didDie = slime.takeHit(damage);
    this.flashSpriteWhite(slime, 90);
    slime.applyKnockback(now, knockbackX, -120, didDie ? 260 : 180);
    this.flashSlime(slime, didDie);
    this.spawnHitImpact(slime.x, slime.y);

    if (!didDie) {
      return;
    }

    slime.isDying = true;
    slime.body.enable = false;
    this.time.delayedCall(170, () => {
      if (!slime.active) {
        return;
      }
      this.spawnXpGem(slime.x, slime.y);
      if (Phaser.Math.Between(0, 100) < 45) {
        this.spawnCoin(slime.x, slime.y);
      }
      slime.destroy();
    });
  }

  safeApplyDamageToSlime(slime, damage, knockbackX) {
    if (!slime || !slime.active || typeof slime.takeHit !== "function") {
      return;
    }

    try {
      this.applyDamageToSlime(slime, damage, knockbackX);
    } catch (_error) {
      // Harten Laufzeitabsturz im Kampf in Release-Builds vermeiden.
    }
  }

  flashSlime(slime, didDie) {
    const flashColorA = didDie ? 0xffffff : 0xff8b8b;
    const flashColorB = didDie ? 0xff4f4f : 0xffffff;
    const repeats = didDie ? 3 : 2;
    let step = 0;

    this.time.addEvent({
      delay: 45,
      repeat: repeats,
      callback: () => {
        if (!slime.active) {
          return;
        }
        slime.setTint(step % 2 === 0 ? flashColorA : flashColorB);
        step += 1;
      },
    });

    this.time.delayedCall((repeats + 1) * 45 + 20, () => {
      if (slime.active) {
        slime.restoreVariantTint?.();
      }
    });
  }

  spawnXpGem(x, y) {
    const gem = this.add.circle(x, y - 8, 7, 0xffd54a, 1);
    gem.setStrokeStyle(2, 0xfff4a3, 0.9);
    this.physics.add.existing(gem);
    this.xpGems.add(gem);
    gem.body.setCollideWorldBounds(false);
    gem.body.setBounce(0.25);
    gem.body.setDragX(260);
    gem.body.setVelocity(Phaser.Math.Between(-45, 45), -140);
  }

  spawnCoin(x, y) {
    const coin = this.add.image(x, y - 4, "coin").setDepth(7).setScale(1.2);
    this.physics.add.existing(coin);
    this.coins.add(coin);
    coin.body.setBounce(0.25);
    coin.body.setDragX(280);
    coin.body.setVelocity(Phaser.Math.Between(-70, 70), -150);
  }

  handleCoinPickup(a, b) {
    const pair = this.pickPlayerAndOther(a, b);
    if (!pair || !this.coins.contains(pair.other)) {
      return;
    }
    const coin = pair.other;

    if (!coin.active) {
      return;
    }
    coin.destroy();
    this.gold += 1;
  }

  handleGemPickup(a, b) {
    const pair = this.pickPlayerAndOther(a, b);
    if (!pair || !this.xpGems.contains(pair.other)) {
      return;
    }
    const { player } = pair;
    const gem = pair.other;

    if (!gem.active) {
      return;
    }

    const levelUps = player.gainXp(XP_GEM_VALUE);
    gem.destroy();

    if (levelUps > 0) {
      this.tweens.add({
        targets: this.levelText,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 120,
        yoyo: true,
      });
      this.openLevelUpMenu(levelUps);
    }
  }

  spawnHitImpact(x, y) {
    this.hitEmitter.explode(12, x, y);
  }

  onPlayerJump(player) {
    this.dustEmitter.explode(6, player.x, player.y + 12);
  }

  onPlayerLanded(player) {
    this.dustEmitter.explode(10, player.x, player.y + 12);
  }

  flashSpriteWhite(sprite, durationMs = 90) {
    if (!sprite || !sprite.active) {
      return;
    }

    sprite.setTint(0xffffff);
    this.time.delayedCall(durationMs, () => {
      if (!sprite.active) {
        return;
      }

      if (sprite === this.player && this.player.isAttacking) {
        sprite.setTint(0xfff08a);
      } else {
        sprite.clearTint();
      }
    });
  }

  initAudioSystem() {
    this.bgmKeyForest = "bgm-forest";
    this.bgmKeyBoss = "bgm-boss";
    this.currentMusicKey = null;
    this.bgm = null;
    this.sfxKeys = {
      playerJump: "sfx-jump",
      swordSwing: "sfx-sword",
      bossDeathCry: "sfx-boss-death",
      shopChing: "sfx-shop-ching",
    };
    this.sfxInstances = {};
  }

  /**
   * Chrome / Browser: AudioContext bleibt gesperrt, bis zur Nutzerinteraktion (Klick, Taste).
   */
  setupWebAudioUnlock() {
    let done = false;
    const kb = this.input.keyboard;
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      kb?.off("keydown", finish);
      const ctx = this.sound?.context;
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      this.playBackgroundMusicForCurrentZone();
    };
    this.input.once("pointerdown", finish);
    kb?.on("keydown", finish);
  }

  playBackgroundMusicForCurrentZone() {
    const wantsBossMusic =
      !!this.currentZone?.boss && !this.bossDefeatedZones.has(this.currentZoneId);
    const targetKey = wantsBossMusic ? this.bgmKeyBoss : this.bgmKeyForest;
    this.switchMusic(targetKey);
  }

  switchMusic(targetKey) {
    if (this.currentMusicKey === targetKey) {
      return;
    }

    this.stopBackgroundMusic();
    this.currentMusicKey = targetKey;

    if (!this.cache.audio.exists(targetKey)) {
      return;
    }

    this.bgm = this.sound.add(targetKey, {
      loop: true,
      volume: 0.45,
    });
    this.bgm.play();
  }

  stopBackgroundMusic() {
    if (!this.bgm) {
      return;
    }
    this.bgm.stop();
    this.bgm.destroy();
    this.bgm = null;
    this.currentMusicKey = null;
  }

  playSfx(id) {
    const key = this.sfxKeys[id];
    if (!key || !this.cache.audio.exists(key)) {
      return;
    }

    if (!this.sfxInstances[id]) {
      this.sfxInstances[id] = this.sound.add(key, {
        volume: id === "bossDeathCry" ? 0.7 : 0.55,
      });
    }

    this.sfxInstances[id].play();
  }

  setupCamera() {
    const maxZoneW = Math.max(
      ...Object.values(ZONES).map((z) => getZoneWidth(z))
    );
    this.cameras.main.setBounds(0, 0, maxZoneW, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.roundPixels = true;
  }

  addHud() {
    this.hudPanel = this.add
      .rectangle(12, 12, 420, 100, 0x101523, 0.8)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001)
      .setStrokeStyle(2, 0x8be9fd, 0.8);

    this.levelText = this.add
      .text(22, 20, "", {
        fontFamily: "Courier New",
        fontSize: "22px",
        color: "#f4ff76",
        fontStyle: "bold",
        stroke: "#202438",
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(1002);

    this.zoneNameText = this.add
      .text(430, 18, "", {
        fontFamily: "Courier New",
        fontSize: "15px",
        color: "#d8efff",
        backgroundColor: "#00000066",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1002);

    this.keyInventoryIcon = this.add
      .image(430, 44, "questKey")
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(1002)
      .setAlpha(0.3);

    this.keyInventoryLabel = this.add
      .text(404, 38, "-", {
        fontFamily: "Courier New",
        fontSize: "12px",
        color: "#f9e27d",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1002);

    this.goldIcon = this.add
      .image(430, 64, "coin")
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    this.goldText = this.add
      .text(402, 57, "0", {
        fontFamily: "Courier New",
        fontSize: "16px",
        color: "#ffd86e",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1002);

    this.hpHeartIcon = this.add
      .image(150, 31, "heartIcon")
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    this.hpText = this.add
      .text(172, 22, "", {
        fontFamily: "Courier New",
        fontSize: "18px",
        color: "#ff7b7b",
        fontStyle: "bold",
        stroke: "#202438",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(1002);

    this.manaLabelText = this.add
      .text(150, 49, "MANA", {
        fontFamily: "Courier New",
        fontSize: "13px",
        color: "#9bd3ff",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(1002);

    this.manaBarBackground = this.add
      .rectangle(196, 52, 160, 9, 0x22345c, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001)
      .setStrokeStyle(1, 0x4a73b6, 1);

    this.manaBarFill = this.add
      .rectangle(197, 53, 0, 7, 0x49a8ff, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1002);

    this.xpLabelText = this.add
      .text(22, 74, "XP", {
        fontFamily: "Courier New",
        fontSize: "15px",
        color: "#f6ffdd",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(1002);

    this.xpBarBackground = this.add
      .rectangle(56, 76, 350, 12, 0x222a42, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001)
      .setStrokeStyle(2, 0x4d5b8f, 1);

    this.xpBarFill = this.add
      .rectangle(58, 78, 0, 8, 0x72f1b8, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1002);

    this.xpText = this.add
      .text(410, 73, "", {
        fontFamily: "Courier New",
        fontSize: "13px",
        color: "#dfffe1",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1002);

    this.doorPromptText = this.add
      .text(0, 0, "", {
        fontFamily: "Courier New",
        fontSize: "15px",
        color: "#fff5b1",
        backgroundColor: "#00000088",
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(1003)
      .setVisible(false);

    this.dialogueBox = this.add
      .rectangle(20, 0, this.cameras.main.width - 40, 112, 0x03040a, 0.9)
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(1200)
      .setStrokeStyle(2, 0x8ec8ff, 0.85)
      .setVisible(false);

    this.dialogueText = this.add
      .text(34, 0, "", {
        fontFamily: "Courier New",
        fontSize: "18px",
        color: "#f3f8ff",
        wordWrap: { width: this.cameras.main.width - 80, useAdvancedWrap: true },
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(1201)
      .setVisible(false);

    this.chestPromptText = this.add
      .text(0, 0, "", {
        fontFamily: "Courier New",
        fontSize: "14px",
        color: "#ffe998",
        backgroundColor: "#00000088",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(1202)
      .setVisible(false);

    this.merchantPromptText = this.add
      .text(0, 0, "", {
        fontFamily: "Courier New",
        fontSize: "14px",
        color: "#b7f8c6",
        backgroundColor: "#00000088",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(1202)
      .setVisible(false);

    this.bossBarBg = this.add
      .rectangle(this.cameras.main.width * 0.5 - 170, 14, 340, 16, 0x2a0b0b, 0.95)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1400)
      .setStrokeStyle(2, 0xffc8c8, 0.9)
      .setVisible(false);

    this.bossBarFill = this.add
      .rectangle(this.cameras.main.width * 0.5 - 168, 16, 336, 12, 0xeb3d3d, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1401)
      .setVisible(false);

    this.bossNameText = this.add
      .text(this.cameras.main.width * 0.5, 34, "Großer Ritter", {
        fontFamily: "Courier New",
        fontSize: "14px",
        color: "#ffe8e8",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1401)
      .setVisible(false);

    this.gameOverOverlay = this.add
      .rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.88)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1900)
      .setVisible(false);

    this.gameOverTitle = this.add
      .text(this.cameras.main.width * 0.5, this.cameras.main.height * 0.42, "Du bist gestorben", {
        fontFamily: "Courier New",
        fontSize: "52px",
        color: "#ffd1d1",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1901)
      .setVisible(false);

    this.retryButton = this.add
      .text(this.cameras.main.width * 0.5, this.cameras.main.height * 0.58, "Erneut versuchen", {
        fontFamily: "Courier New",
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#325fa1",
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1901)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.retryButton.on("pointerup", () => this.retryFromCheckpoint());

    this.victoryOverlay = this.add
      .rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.86)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2000)
      .setVisible(false);

    this.victoryText = this.add
      .text(
        this.cameras.main.width * 0.5,
        this.cameras.main.height * 0.42,
        "Glückwunsch!\nDu hast das legendäre Schwert gefunden!",
        {
          fontFamily: "Courier New",
          fontSize: "40px",
          color: "#fff2a8",
          fontStyle: "bold",
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false);

    this.returnMenuButton = this.add
      .text(
        this.cameras.main.width * 0.5,
        this.cameras.main.height * 0.62,
        "Zurück zum Menü",
        {
          fontFamily: "Courier New",
          fontSize: "26px",
          color: "#ffffff",
          backgroundColor: "#3d5f2b",
          padding: { x: 16, y: 10 },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2001)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.returnMenuButton.on("pointerup", () => this.returnToMainMenu());

    this.createLevelUpMenuUi();

    this.createMinimapUi();
    this.createJournalUi();
    this.createShopUi();
  }

  createMinimapUi() {
    this.minimapPanel = this.add
      .rectangle(0, 0, 224, 124, 0x0a1020, 0.8)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1100)
      .setStrokeStyle(2, 0x4e6fa8, 0.9);

    this.minimapGraphics = this.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(1101);
  }

  createJournalUi() {
    this.questArrow = this.add
      .text(0, 0, "^", {
        fontFamily: "Courier New",
        fontSize: "28px",
        color: "#ffd45f",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1600)
      .setVisible(false);

    this.journalOverlay = this.add
      .rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.85)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2200)
      .setVisible(false);

    this.journalTitle = this.add
      .text(this.cameras.main.width * 0.5, this.cameras.main.height * 0.24, "Quest-Tagebuch", {
        fontFamily: "Courier New",
        fontSize: "42px",
        color: "#f7f2cc",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2201)
      .setVisible(false);

    this.journalBodyText = this.add
      .text(this.cameras.main.width * 0.5, this.cameras.main.height * 0.42, "", {
        fontFamily: "Courier New",
        fontSize: "20px",
        color: "#dbe9ff",
        align: "left",
        lineSpacing: 10,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2201)
      .setVisible(false);

    this.journalHintText = this.add
      .text(this.cameras.main.width * 0.5, this.cameras.main.height * 0.78, "Drücke Q zum Schließen", {
        fontFamily: "Courier New",
        fontSize: "16px",
        color: "#f4d996",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2201)
      .setVisible(false);
  }

  createShopUi() {
    this.shopOverlay = this.add
      .rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.88)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2300)
      .setVisible(false);

    this.shopTitleText = this.add
      .text(this.cameras.main.width * 0.5, this.cameras.main.height * 0.2, "Händlerladen", {
        fontFamily: "Courier New",
        fontSize: "38px",
        color: "#f7f1c7",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2301)
      .setVisible(false);

    this.shopHintText = this.add
      .text(
        this.cameras.main.width * 0.5,
        this.cameras.main.height * 0.26,
        "Pfeile + Enter zum Kaufen, Q zum Schließen",
        {
          fontFamily: "Courier New",
          fontSize: "15px",
          color: "#d5e7ff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2301)
      .setVisible(false);

    this.shopMessageText = this.add
      .text(this.cameras.main.width * 0.5, this.cameras.main.height * 0.72, "", {
        fontFamily: "Courier New",
        fontSize: "20px",
        color: "#ffe58a",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2302)
      .setVisible(false);

    const defs = [
      {
        id: "potion",
        icon: "heartIcon",
        title: "Heiltrank",
        desc: "Heilt vollständig",
        price: SHOP_HEAL_POTION_COST,
      },
      {
        id: "manaRing",
        icon: "questKey",
        title: "Mana-Ring",
        desc: "Stellt Mana +20% wieder her",
        price: SHOP_MANA_RING_COST,
      },
      {
        id: "iceSpell",
        icon: "fireball",
        title: "Eiszauber",
        desc: "Schaltet X frei (2s einfrieren)",
        price: SHOP_ICE_SPELL_COST,
      },
    ];

    this.shopItemCards = defs.map((def, index) => {
      const x = this.cameras.main.width * 0.5 + (index - 1) * 240;
      const y = this.cameras.main.height * 0.48;

      const bg = this.add
        .rectangle(x, y, 210, 170, 0x244934, 0.95)
        .setScrollFactor(0)
        .setDepth(2302)
        .setStrokeStyle(3, 0x8ad8a8, 1)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });

      const icon = this.add
        .image(x, y - 42, def.icon)
        .setScale(2)
        .setScrollFactor(0)
        .setDepth(2303)
        .setVisible(false);

      const title = this.add
        .text(x, y + 6, def.title, {
          fontFamily: "Courier New",
          fontSize: "19px",
          color: "#ffffff",
          fontStyle: "bold",
          align: "center",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(2303)
        .setVisible(false);

      const desc = this.add
        .text(x, y + 34, def.desc, {
          fontFamily: "Courier New",
          fontSize: "13px",
          color: "#dceeff",
          align: "center",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(2303)
        .setVisible(false);

      const price = this.add
        .text(x, y + 62, `${def.price} or`, {
          fontFamily: "Courier New",
          fontSize: "18px",
          color: "#ffd05d",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(2303)
        .setVisible(false);

      bg.on("pointerup", () => {
        if (!this.isShopOpen) {
          return;
        }
        this.activeShopIndex = index;
        this.buyShopItem(def.id);
        this.refreshShopSelectionVisual();
      });

      bg.on("pointerover", () => {
        if (!this.isShopOpen) {
          return;
        }
        this.activeShopIndex = index;
        this.refreshShopSelectionVisual();
      });

      return { ...def, bg, icon, title, desc, price };
    });
  }

  updateHud() {
    const hp = this.player.getHp();
    const maxHp = this.player.getMaxHp();
    const level = this.player.getLevel();
    const xp = this.player.getXp();
    const xpToNext = this.player.getXpToNextLevel();
    const xpRatio = this.player.getXpRatio();
    const manaRatio = this.player.getManaRatio();

    this.levelText.setText(`LEVEL ${level}`);
    this.hpText.setText(`${hp}/${maxHp}`);
    this.xpText.setText(`${xp}/${xpToNext}`);
    this.xpBarFill.displayWidth = 346 * xpRatio;
    this.manaBarFill.displayWidth = 158 * manaRatio;
    this.keyInventoryIcon.setAlpha(this.hasQuestKey ? 1 : 0.3);
    this.keyInventoryLabel.setText(this.hasQuestKey ? "SCHL" : "-");
    this.goldText.setText(`${this.gold}`);

    const hudBottom = this.cameras.main.height;
    this.dialogueBox.setPosition(20, hudBottom - 16);
    this.dialogueBox.width = this.cameras.main.width - 40;
    this.dialogueText.setPosition(34, hudBottom - 28);
    this.dialogueText.setWordWrapWidth(this.cameras.main.width - 80);

    const bossBarX = this.cameras.main.width * 0.5 - 170;
    this.bossBarBg.setPosition(bossBarX, 14);
    this.bossBarFill.setPosition(bossBarX + 2, 16);
    this.bossNameText.setPosition(this.cameras.main.width * 0.5, 34);
    if (this.boss && this.boss.active && !this.boss.isDead) {
      this.bossBarFill.displayWidth = 336 * this.boss.getHpRatio();
    } else if (this.finalBoss && this.finalBoss.active && !this.finalBoss.isDead) {
      this.bossBarFill.displayWidth = 336 * this.finalBoss.getHpRatio();
    }

    this.gameOverOverlay.setSize(this.cameras.main.width, this.cameras.main.height);
    this.gameOverTitle.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.42
    );
    this.retryButton.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.58
    );

    this.victoryOverlay.setSize(this.cameras.main.width, this.cameras.main.height);
    this.victoryText.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.42
    );
    this.returnMenuButton.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.62
    );

    this.levelUpOverlay.setSize(this.cameras.main.width, this.cameras.main.height);
    this.levelUpTitle.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.2
    );
    this.levelUpHint.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.26
    );
    this.levelUpOptions.forEach((option, index) => {
      const x = this.cameras.main.width * 0.5 + (index - 1) * 240;
      const y = this.cameras.main.height * 0.52;
      option.bg.setPosition(x, y);
      option.icon.setPosition(x, y - 34);
      option.title.setPosition(x, y + 14);
      option.desc.setPosition(x, y + 44);
    });

    this.journalOverlay.setSize(this.cameras.main.width, this.cameras.main.height);
    this.journalTitle.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.24
    );
    this.journalBodyText.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.42
    );
    this.journalHintText.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.78
    );

    this.shopOverlay.setSize(this.cameras.main.width, this.cameras.main.height);
    this.shopTitleText.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.2
    );
    this.shopHintText.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.26
    );
    this.shopMessageText.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.72
    );
    this.shopItemCards.forEach((card, index) => {
      const x = this.cameras.main.width * 0.5 + (index - 1) * 240;
      const y = this.cameras.main.height * 0.48;
      card.bg.setPosition(x, y);
      card.icon.setPosition(x, y - 42);
      card.title.setPosition(x, y + 6);
      card.desc.setPosition(x, y + 34);
      card.price.setPosition(x, y + 62);
    });
  }

  updateDoorPrompt() {
    if (!this.activeDoor) {
      this.doorPromptText.setVisible(false);
      return;
    }

    const lockedStory =
      this.activeDoor.requiresStoryFlag &&
      !this.storyFlags[this.activeDoor.requiresStoryFlag];
    const prompt =
      ((this.activeDoor.requiresKey && !this.hasQuestKey) ||
        (this.activeDoor.requiresLegendarySword && !this.hasLegendarySword) ||
        lockedStory)
        ? "Drücke ↑ (verschlossen)"
        : "Drücke ↑ zum Betreten";
    this.doorPromptText.setText(prompt);
    this.doorPromptText.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height - 24
    );
    this.doorPromptText.setVisible(true);
  }

  handleFullscreenToggle() {
    const wantToggle =
      Phaser.Input.Keyboard.JustDown(this.fullscreenKey) ||
      Phaser.Input.Keyboard.JustDown(this.fullscreenAltKey);
    if (!wantToggle) {
      return;
    }

    this.requestFullscreenToggle();
  }

  requestFullscreenToggle() {
    toggleGameFullscreen().then((ok) => {
      if (ok) {
        this.time.delayedCall(80, () => {
          this.scale.refresh();
          this.layoutFullscreenButton?.();
        });
      }
    });
  }

  addFullscreenButton() {
    this.fullscreenBtn = this.add
      .text(0, 10, "[ Vollbild ]", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#e8ffcc",
        backgroundColor: "#1b3a1bcc",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1002)
      .setInteractive({ useHandCursor: true });

    this.fullscreenBtn.on("pointerover", () => {
      this.fullscreenBtn.setBackgroundColor("#2a5a2aee");
    });
    this.fullscreenBtn.on("pointerout", () => {
      this.fullscreenBtn.setBackgroundColor("#1b3a1bcc");
    });
    this.fullscreenBtn.on("pointerup", () => {
      this.requestFullscreenToggle();
    });

    this.layoutFullscreenButton = () => {
      if (!this.fullscreenBtn || !this.fullscreenBtn.active) {
        return;
      }
      this.fullscreenBtn.setX(this.cameras.main.width - 12);
    };
    this.layoutFullscreenButton();
    this.scale.on("resize", this.layoutFullscreenButton, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.layoutFullscreenButton, this);
    });
  }

  handleDebugTeleports() {
    if (
      this.isTransitioning ||
      this.isJournalOpen ||
      this.isShopOpen ||
      this.isLevelUpMenuOpen ||
      this.isGameOver ||
      this.isVictory ||
      this.isEndingCinematic
    ) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.debugTeleportKeys.one)) {
      this.transitionToZone("zone1", ZONES.zone1.defaultSpawn);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugTeleportKeys.two)) {
      this.transitionToZone("zone2", ZONES.zone2.defaultSpawn);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugTeleportKeys.three)) {
      this.transitionToZone("zone3", ZONES.zone3.defaultSpawn);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugTeleportKeys.four)) {
      this.transitionToZone("zone4", ZONES.zone4.defaultSpawn);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugTeleportKeys.five)) {
      this.transitionToZone("zone5", ZONES.zone5.defaultSpawn);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugTeleportKeys.six)) {
      this.transitionToZone("zone6", ZONES.zone6.defaultSpawn);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugTeleportKeys.seven)) {
      this.transitionToZone("zone7", ZONES.zone7.defaultSpawn);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugTeleportKeys.eight)) {
      this.transitionToZone("zone8", ZONES.zone8.defaultSpawn);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugTeleportKeys.nine)) {
      this.transitionToZone("zone9", ZONES.zone9.defaultSpawn);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugTeleportKeys.zero)) {
      this.transitionToZone("cave", ZONES.cave.defaultSpawn);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugTeleportKeys.minus)) {
      this.transitionToZone("castle", ZONES.castle.defaultSpawn);
    }
  }

  updateChestPrompt() {
    if (!this.activeChest || this.isGameOver || this.isVictory) {
      this.chestPromptText.setVisible(false);
      return;
    }

    this.chestPromptText.setText("Drücke ↑, um die Truhe zu öffnen");
    this.chestPromptText.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height - 56
    );
    this.chestPromptText.setVisible(true);
  }

  handleJournalToggle() {
    if (!Phaser.Input.Keyboard.JustDown(this.journalToggleKey)) {
      return;
    }

    // Shop muss sich mit Q schließen: JustDown ist nur einmal pro Frame lesbar
    // (Phaser), daher hier vor handleShopMenuInput — sonst „verschluckt“ Q den Tastendruck.
    if (this.isShopOpen) {
      this.closeShopMenu();
      return;
    }

    if (
      this.isGameOver ||
      this.isVictory ||
      this.isTransitioning ||
      this.isLevelUpMenuOpen
    ) {
      return;
    }

    if (this.isJournalOpen) {
      this.closeJournal();
      return;
    }

    this.openJournal();
  }

  openJournal() {
    this.isJournalOpen = true;
    this.input.setDefaultCursor("default");
    this.physics.world.pause();
    this.minimapPanel.setVisible(false);
    this.minimapGraphics.setVisible(false);
    this.questArrow.setVisible(false);
    this.updateJournalText();
    this.journalOverlay.setVisible(true);
    this.journalTitle.setVisible(true);
    this.journalBodyText.setVisible(true);
    this.journalHintText.setVisible(true);
  }

  closeJournal() {
    this.isJournalOpen = false;
    this.input.setDefaultCursor("none");
    this.physics.world.resume();
    this.minimapPanel.setVisible(true);
    this.minimapGraphics.setVisible(true);
    this.journalOverlay.setVisible(false);
    this.journalTitle.setVisible(false);
    this.journalBodyText.setVisible(false);
    this.journalHintText.setVisible(false);
  }

  updateJournalText() {
    const entries = this.getQuestEntries();
    const text = entries
      .map((entry, index) => {
        const status = entry.done ? "[ERLEDIGT]" : "[AKTIV]";
        return `${index + 1}. ${entry.label} ${status}`;
      })
      .join("\n\n");
    this.journalBodyText.setText(text);
  }

  getQuestEntries() {
    const findKeyDone = this.hasQuestKey;
    const bossDone = this.bossDefeatedZones.has("zone2");
    const ruinsDone = !!this.storyFlags?.ruinsPuzzleSolved;
    const golemDone = this.bossDefeatedZones.has("zone8");
    const chestDone = this.hasLegendarySword;
    const finalBossDone = this.finalBossDefeated;

    return [
      { id: "key", label: "Finde den Schlüssel (Osttal)", done: findKeyDone },
      { id: "boss", label: "Besiege den Großen Ritter", done: bossDone },
      { id: "ruins", label: "Statuenrätsel (Vergessene Ruinen)", done: ruinsDone },
      { id: "golem", label: "Besiege den Golem", done: golemDone },
      { id: "chest", label: "Öffne die legendäre Truhe", done: chestDone },
      { id: "finalBoss", label: "Besiege den Thronzauberer", done: finalBossDone },
    ];
  }

  getPrimaryObjective() {
    const entries = this.getQuestEntries();
    const active = entries.find((entry) => !entry.done);
    if (!active) {
      return null;
    }

    if (active.id === "key") {
      const lockedDoor = ZONES.zone1.doors[0];
      return {
        zoneId: "zone1",
        x: lockedDoor?.x ?? 740,
        y: lockedDoor?.y ?? WORLD_HEIGHT - 186,
      };
    }

    if (active.id === "boss") {
      const zoneBoss = ZONES.zone2.boss;
      return {
        zoneId: "zone2",
        x: zoneBoss?.x ?? 3100,
        y: zoneBoss?.y ?? WORLD_HEIGHT - 150,
      };
    }

    if (active.id === "ruins") {
      return {
        zoneId: "zone4",
        x: 1500,
        y: WORLD_HEIGHT - 200,
      };
    }

    if (active.id === "golem") {
      const b = ZONES.zone8.boss;
      return {
        zoneId: "zone8",
        x: b?.x ?? 2200,
        y: b?.y ?? WORLD_HEIGHT - 140,
      };
    }

    const chest = ZONES.zone2.boss?.chestSpawn ?? { x: 3100, y: WORLD_HEIGHT - 162 };
    if (active.id === "chest") {
      return {
        zoneId: "zone2",
        x: chest.x,
        y: chest.y,
      };
    }

    const finalBoss = ZONES.castle.finalBoss ?? { x: 2620, y: WORLD_HEIGHT - 150 };
    return {
      zoneId: "castle",
      x: finalBoss.x,
      y: finalBoss.y,
    };
  }

  updateQuestArrow() {
    if (
      this.isJournalOpen ||
      this.isGameOver ||
      this.isVictory ||
      this.isTransitioning ||
      this.isEndingCinematic
    ) {
      this.questArrow.setVisible(false);
      return;
    }

    const objective = this.getPrimaryObjective();
    if (!objective) {
      this.questArrow.setVisible(false);
      return;
    }

    const cam = this.cameras.main;
    let targetX = objective.x;
    let targetY = objective.y;

    if (objective.zoneId !== this.currentZoneId) {
      const mainPath = [
        "zone1",
        "zone2",
        "zone3",
        "zone4",
        "zone5",
        "zone6",
        "zone7",
        "zone8",
        "zone9",
        "castle",
      ];
      const ci = mainPath.indexOf(this.currentZoneId);
      const oi = mainPath.indexOf(objective.zoneId);
      const toRight =
        oi >= 0 && ci >= 0 ? oi > ci : objective.zoneId === "castle";
      targetX = toRight ? cam.scrollX + cam.width + 200 : cam.scrollX - 200;
      targetY = cam.scrollY + cam.height * 0.5;
    }

    const screenX = targetX - cam.scrollX;
    const screenY = targetY - cam.scrollY;
    const centerX = cam.width * 0.5;
    const centerY = cam.height * 0.5;
    const angle = Phaser.Math.Angle.Between(centerX, centerY, screenX, screenY);
    const radius = Math.min(cam.width, cam.height) * 0.42;
    const drawX = Phaser.Math.Clamp(
      centerX + Math.cos(angle) * radius,
      24,
      cam.width - 24
    );
    const drawY = Phaser.Math.Clamp(
      centerY + Math.sin(angle) * radius,
      24,
      cam.height - 24
    );

    this.questArrow.setPosition(drawX, drawY);
    this.questArrow.setAngle(Phaser.Math.RadToDeg(angle) + 90);
    this.questArrow.setVisible(true);
  }

  updateMinimap() {
    const g = this.minimapGraphics;
    if (!g || !this.currentZone) {
      return;
    }

    const panelW = 224;
    const panelH = 124;
    const panelX = this.cameras.main.width - panelW - 12;
    const panelY = 12;
    const mapPadding = 8;
    const mapW = panelW - mapPadding * 2;
    const mapH = panelH - mapPadding * 2;
    const sx = mapW / (this.currentZoneWidth ?? WORLD_WIDTH);
    const sy = mapH / WORLD_HEIGHT;

    this.minimapPanel.setPosition(panelX, panelY);
    g.clear();
    g.fillStyle(0x121a2f, 0.9);
    g.fillRect(panelX + mapPadding, panelY + mapPadding, mapW, mapH);

    g.fillStyle(0x5a6a86, 0.9);
    this.currentZone.platforms.forEach(([startX, y, width]) => {
      g.fillRect(
        panelX + mapPadding + startX * TILE_SIZE * sx,
        panelY + mapPadding + y * TILE_SIZE * sy,
        width * TILE_SIZE * sx,
        Math.max(2, 4 * sy)
      );
    });
    g.fillStyle(0x7a8fb1, 0.95);
    this.currentZone.oneWays.forEach(([startX, y, width]) => {
      g.fillRect(
        panelX + mapPadding + startX * TILE_SIZE * sx,
        panelY + mapPadding + y * TILE_SIZE * sy,
        width * TILE_SIZE * sx,
        1
      );
    });
    g.fillRect(
      panelX + mapPadding,
      panelY + mapPadding + (WORLD_HEIGHT - 54) * sy,
      mapW,
      Math.max(2, 6 * sy)
    );

    g.fillStyle(0xff5656, 1);
    this.slimes?.getChildren().forEach((slime) => {
      if (!slime.active) {
        return;
      }
      g.fillCircle(
        panelX + mapPadding + slime.x * sx,
        panelY + mapPadding + slime.y * sy,
        2
      );
    });
    if (this.boss && this.boss.active && !this.boss.isDead) {
      g.fillStyle(0xff1111, 1);
      g.fillCircle(
        panelX + mapPadding + this.boss.x * sx,
        panelY + mapPadding + this.boss.y * sy,
        4
      );
    }

    g.fillStyle(0x4eb0ff, 1);
    g.fillCircle(
      panelX + mapPadding + this.player.x * sx,
      panelY + mapPadding + this.player.y * sy,
      3
    );

    const objective = this.getPrimaryObjective();
    if (objective && objective.zoneId === this.currentZoneId) {
      g.fillStyle(0xffd86f, 1);
      g.fillCircle(
        panelX + mapPadding + objective.x * sx,
        panelY + mapPadding + objective.y * sy,
        2
      );
    }
  }

  setBossHudVisible(visible, bossName = null) {
    this.bossBarBg.setVisible(visible);
    this.bossBarFill.setVisible(visible);
    this.bossNameText.setVisible(visible);
    if (visible && bossName) {
      this.bossNameText.setText(bossName);
    }
  }

  updateNpcPrompt() {
    if (!this.npcs) {
      return;
    }

    this.npcs.getChildren().forEach((npc) => {
      if (!npc.prompt || !npc.active) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        npc.x,
        npc.y
      );
      npc.prompt.setPosition(npc.x, npc.y - 42);
      npc.prompt.setVisible(distance < 70);
    });
  }

  updateMerchantPrompt() {
    if (!this.activeMerchant || this.isShopOpen || this.isGameOver || this.isVictory) {
      this.merchantPromptText.setVisible(false);
      return;
    }

    this.merchantPromptText.setText("Drücke ↑, um mit dem Händler zu sprechen");
    this.merchantPromptText.setPosition(
      this.cameras.main.width * 0.5,
      this.cameras.main.height - 88
    );
    this.merchantPromptText.setVisible(true);
  }

  getShopItems() {
    return [
      {
        id: "potion",
        title: "Heiltrank",
        description: "Stellt alle LP wieder her",
        price: SHOP_HEAL_POTION_COST,
      },
      {
        id: "manaRing",
        title: "Mana-Ring",
        description: "Stellt Mana +20% wieder her",
        price: SHOP_MANA_RING_COST,
      },
      {
        id: "iceSpell",
        title: "Eiszauber",
        description: "Schaltet Zauber X frei (2s einfrieren)",
        price: SHOP_ICE_SPELL_COST,
      },
    ];
  }

  openShopMenu() {
    this.isShopOpen = true;
    this.activeShopIndex = 0;
    this.physics.world.pause();
    this.input.setDefaultCursor("default");
    this.minimapPanel.setVisible(false);
    this.minimapGraphics.setVisible(false);
    this.questArrow.setVisible(false);
    this.shopOverlay.setVisible(true);
    this.shopTitleText.setVisible(true);
    this.shopHintText.setVisible(true);
    this.shopItemCards.forEach((card) => {
      card.bg.setVisible(true);
      card.icon.setVisible(true);
      card.title.setVisible(true);
      card.desc.setVisible(true);
      card.price.setVisible(true);
    });
    this.refreshShopSelectionVisual();
  }

  closeShopMenu() {
    this.isShopOpen = false;
    this.physics.world.resume();
    this.input.setDefaultCursor("none");
    this.minimapPanel.setVisible(true);
    this.minimapGraphics.setVisible(true);
    this.shopOverlay.setVisible(false);
    this.shopTitleText.setVisible(false);
    this.shopHintText.setVisible(false);
    this.shopMessageText.setVisible(false);
    this.shopItemCards.forEach((card) => {
      card.bg.setVisible(false);
      card.icon.setVisible(false);
      card.title.setVisible(false);
      card.desc.setVisible(false);
      card.price.setVisible(false);
    });
  }

  handleShopMenuInput() {
    if (Phaser.Input.Keyboard.JustDown(this.journalToggleKey)) {
      this.closeShopMenu();
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.shopInputKeys.left)
    ) {
      this.activeShopIndex =
        (this.activeShopIndex + this.shopItemCards.length - 1) %
        this.shopItemCards.length;
      this.refreshShopSelectionVisual();
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.shopInputKeys.right)
    ) {
      this.activeShopIndex = (this.activeShopIndex + 1) % this.shopItemCards.length;
      this.refreshShopSelectionVisual();
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.shopInputKeys.enter) ||
      Phaser.Input.Keyboard.JustDown(this.shopInputKeys.space) ||
      Phaser.Input.Keyboard.JustDown(this.shopInputKeys.up)
    ) {
      this.buyShopItem(this.shopItemCards[this.activeShopIndex].id);
    }
  }

  refreshShopSelectionVisual() {
    this.shopItemCards.forEach((card, index) => {
      const selected = index === this.activeShopIndex;
      card.bg.setFillStyle(selected ? 0x2d633f : 0x244934, 0.95);
      card.bg.setStrokeStyle(selected ? 4 : 3, selected ? 0xf7e58f : 0x8ad8a8, 1);
    });
  }

  buyShopItem(itemId) {
    const item = this.getShopItems().find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    if (this.gold < item.price) {
      this.showShopMessage("Nicht genug Gold!");
      return;
    }

    if (itemId === "iceSpell" && this.player.hasIceSpell) {
      this.showShopMessage("Eiszauber bereits gelernt.");
      return;
    }

    this.gold -= item.price;

    if (itemId === "potion") {
      this.player.restoreVitals();
    } else if (itemId === "manaRing") {
      this.player.applyManaRingUpgrade();
    } else if (itemId === "iceSpell") {
      this.player.unlockIceSpell();
    }

    this.playSfx("shopChing");
    this.showShopMessage("Kauf bestätigt!");
    this.saveProgress();
  }

  showShopMessage(message) {
    this.shopMessageText.setText(message);
    this.shopMessageText.setVisible(true);
    if (this.shopMessageTimer) {
      this.shopMessageTimer.remove(false);
    }
    this.shopMessageTimer = this.time.delayedCall(1300, () => {
      this.shopMessageText.setVisible(false);
      this.shopMessageTimer = null;
    });
  }

  createLevelUpMenuUi() {
    this.levelUpOverlay = this.add
      .rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.82)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2100)
      .setVisible(false);

    this.levelUpTitle = this.add
      .text(this.cameras.main.width * 0.5, this.cameras.main.height * 0.2, "", {
        fontFamily: "Courier New",
        fontSize: "34px",
        color: "#f9f4c8",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2101)
      .setVisible(false);

    this.levelUpHint = this.add
      .text(
        this.cameras.main.width * 0.5,
        this.cameras.main.height * 0.26,
        "Wähle ein Talent (Pfeile + Enter oder Klick)",
        {
          fontFamily: "Courier New",
          fontSize: "16px",
          color: "#d2e8ff",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2101)
      .setVisible(false);

    const optionDefs = [
      {
        id: "strength",
        icon: "swordSlash",
        title: "Stärke",
        desc: "Schwertschaden +2",
      },
      {
        id: "magic",
        icon: "fireball",
        title: "Magie",
        desc: "Mana -3, vitesse boule +70",
      },
      {
        id: "health",
        icon: "heartIcon",
        title: "Gesundheit",
        desc: "Max LP +1 und volle Heilung",
      },
    ];

    this.levelUpOptions = optionDefs.map((def, index) => {
      const x = this.cameras.main.width * 0.5 + (index - 1) * 240;
      const y = this.cameras.main.height * 0.52;

      const bg = this.add
        .rectangle(x, y, 210, 160, 0x223757, 0.95)
        .setScrollFactor(0)
        .setDepth(2102)
        .setStrokeStyle(3, 0x6f95d3, 1)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });

      const icon = this.add
        .image(x, y - 34, def.icon)
        .setDepth(2103)
        .setScale(2)
        .setVisible(false);

      const title = this.add
        .text(x, y + 14, def.title, {
          fontFamily: "Courier New",
          fontSize: "23px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(2103)
        .setVisible(false);

      const desc = this.add
        .text(x, y + 44, def.desc, {
          fontFamily: "Courier New",
          fontSize: "14px",
          color: "#d7e9ff",
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(2103)
        .setVisible(false);

      bg.on("pointerup", () => {
        if (!this.isLevelUpMenuOpen) {
          return;
        }
        this.activeLevelUpIndex = index;
        this.applyLevelUpChoice(def.id);
      });

      bg.on("pointerover", () => {
        if (!this.isLevelUpMenuOpen) {
          return;
        }
        this.activeLevelUpIndex = index;
        this.refreshLevelUpSelectionVisual();
      });

      return { ...def, bg, icon, title, desc };
    });
  }

  openLevelUpMenu(levelUps = 1) {
    this.pendingLevelUpChoices += levelUps;
    if (this.isLevelUpMenuOpen || this.isGameOver || this.isVictory) {
      return;
    }

    this.isLevelUpMenuOpen = true;
    this.activeLevelUpIndex = 0;
    this.physics.world.pause();
    this.input.setDefaultCursor("default");
    this.minimapPanel.setVisible(false);
    this.minimapGraphics.setVisible(false);
    this.questArrow.setVisible(false);

    this.levelUpOverlay.setVisible(true);
    this.levelUpTitle.setVisible(true);
    this.levelUpHint.setVisible(true);
    this.levelUpOptions.forEach((option) => {
      option.bg.setVisible(true);
      option.icon.setVisible(true);
      option.title.setVisible(true);
      option.desc.setVisible(true);
    });
    this.refreshLevelUpSelectionVisual();
  }

  closeLevelUpMenu() {
    this.isLevelUpMenuOpen = false;
    this.levelUpOverlay.setVisible(false);
    this.levelUpTitle.setVisible(false);
    this.levelUpHint.setVisible(false);
    this.levelUpOptions.forEach((option) => {
      option.bg.setVisible(false);
      option.icon.setVisible(false);
      option.title.setVisible(false);
      option.desc.setVisible(false);
    });
    this.physics.world.resume();
    this.input.setDefaultCursor("none");
    this.minimapPanel.setVisible(true);
    this.minimapGraphics.setVisible(true);
  }

  refreshLevelUpSelectionVisual() {
    this.levelUpTitle.setText(`Level ${this.player.getLevel()} - Wähle ein Talent`);
    this.levelUpOptions.forEach((option, index) => {
      const selected = index === this.activeLevelUpIndex;
      option.bg.setFillStyle(selected ? 0x2f5ea2 : 0x223757, 0.95);
      option.bg.setStrokeStyle(selected ? 4 : 3, selected ? 0xf7e58f : 0x6f95d3, 1);
    });
  }

  handleLevelUpMenuInput() {
    if (
      Phaser.Input.Keyboard.JustDown(this.levelUpInputKeys.left) ||
      Phaser.Input.Keyboard.JustDown(this.levelUpInputKeys.up)
    ) {
      this.activeLevelUpIndex =
        (this.activeLevelUpIndex + this.levelUpOptions.length - 1) %
        this.levelUpOptions.length;
      this.refreshLevelUpSelectionVisual();
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.levelUpInputKeys.right) ||
      Phaser.Input.Keyboard.JustDown(this.levelUpInputKeys.down)
    ) {
      this.activeLevelUpIndex =
        (this.activeLevelUpIndex + 1) % this.levelUpOptions.length;
      this.refreshLevelUpSelectionVisual();
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.levelUpInputKeys.enter) ||
      Phaser.Input.Keyboard.JustDown(this.levelUpInputKeys.space)
    ) {
      const option = this.levelUpOptions[this.activeLevelUpIndex];
      this.applyLevelUpChoice(option.id);
    }
  }

  applyLevelUpChoice(choiceId) {
    if (choiceId === "strength") {
      this.player.applyStrengthUpgrade();
    } else if (choiceId === "magic") {
      this.player.applyMagicUpgrade();
    } else if (choiceId === "health") {
      this.player.applyHealthUpgrade();
    }

    this.pendingLevelUpChoices = Math.max(0, this.pendingLevelUpChoices - 1);
    this.saveProgress();

    if (this.pendingLevelUpChoices > 0) {
      this.refreshLevelUpSelectionVisual();
      return;
    }

    this.closeLevelUpMenu();
  }

  showDialogue(text, duration = 2400) {
    this.dialogueText.setText(text);
    this.dialogueBox.setVisible(true);
    this.dialogueText.setVisible(true);

    if (this.dialogueTimer) {
      this.dialogueTimer.remove(false);
    }

    this.dialogueTimer = this.time.delayedCall(duration, () => {
      this.dialogueBox.setVisible(false);
      this.dialogueText.setVisible(false);
      this.dialogueTimer = null;
    });
  }

  showGameOverScreen() {
    this.input.setDefaultCursor("default");
    this.questArrow.setVisible(false);
    this.gameOverOverlay.setVisible(true);
    this.gameOverTitle.setVisible(true);
    this.retryButton.setVisible(true);
  }

  retryFromCheckpoint() {
    this.startFadeTransition(() => {
      this.isGameOver = false;
      this.input.setDefaultCursor("none");
      this.player.restoreVitals();
      this.time.timeScale = 1;
      this.physics.world.timeScale = 1;
      this.physics.world.resume();
      this.gameOverOverlay.setVisible(false);
      this.gameOverTitle.setVisible(false);
      this.retryButton.setVisible(false);

      if (this.currentZoneId !== this.savedCheckpoint.zoneId) {
        this.switchZone(this.savedCheckpoint.zoneId, {
          x: this.savedCheckpoint.x,
          y: this.savedCheckpoint.y,
        });
        return;
      }

      this.player.setPosition(this.savedCheckpoint.x, this.savedCheckpoint.y);
      this.player.body.setVelocity(0, 0);
      this.player.body.setAcceleration(0, 0);
      this.player.jumpCount = 0;
    });
  }

  showVictoryScreen() {
    this.isVictory = true;
    this.input.setDefaultCursor("default");
    this.questArrow.setVisible(false);
    this.physics.world.pause();
    this.stopBackgroundMusic();
    this.victoryOverlay.setVisible(true);
    this.victoryText.setVisible(true);
    this.returnMenuButton.setVisible(true);
    this.saveProgress();
  }

  returnToMainMenu() {
    this.input.setDefaultCursor("default");
    this.stopBackgroundMusic();
    this.scene.start("mainMenu");
  }

  startEndingCinematic() {
    this.isEndingCinematic = true;
    this.physics.world.pause();
    this.input.setDefaultCursor("default");
    this.questArrow.setVisible(false);
    this.minimapPanel.setVisible(false);
    this.minimapGraphics.setVisible(false);
    this.setBossHudVisible(false);

    const overlay = this.add
      .rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.92)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2600);

    const creditsText = this.add
      .text(
        this.cameras.main.width * 0.5,
        this.cameras.main.height + 140,
        "Glückwunsch, Held!\nDer Frieden ist in das Königreich zurückgekehrt...\n\nCredits\nErstellt von jordan freddy\nmit Hilfe von Cursor",
        {
          fontFamily: "Courier New",
          fontSize: "34px",
          color: "#f7f2d0",
          align: "center",
          lineSpacing: 16,
        }
      )
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(2601);

    this.tweens.add({
      targets: creditsText,
      y: -220,
      duration: 10000,
      ease: "Linear",
    });

    this.time.delayedCall(10000, () => {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch (_error) {
        // localStorage-Fehler ignorieren.
      }
      overlay.destroy();
      creditsText.destroy();
      this.isEndingCinematic = false;
      this.returnToMainMenu();
    });
  }

  addControlsHint() {
    this.add
      .text(
        16,
        118,
        "Bewegen: A/D oder <-/-> | Doppelsprung: W/HOCH | Schwert: LEERTASTE | Feuerball: Z | Eis: X | Sprechen/Betreten: HOCH | Journal: Q | Vollbild: F oder P oder Button | Test-Stages: 1/2/3/4",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ffffff",
          backgroundColor: "#00000066",
          padding: { x: 8, y: 6 },
        }
      )
      .setScrollFactor(0)
      .setDepth(1000);
  }
}
