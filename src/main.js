import { BootScene } from "./scenes/BootScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { MainMenuScene } from "./scenes/MainMenuScene.js";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  GLOBAL_GRAVITY_Y,
} from "./config/constants.js";

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: "game-root",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    /** Cible du vrai plein écran navigateur (API Fullscreen) */
    fullscreenTarget: "game-root",
  },
  pixelArt: true,
  scene: [BootScene, MainMenuScene, GameScene],
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: GLOBAL_GRAVITY_Y },
      debug: false,
    },
  },
};

new Phaser.Game(config);
