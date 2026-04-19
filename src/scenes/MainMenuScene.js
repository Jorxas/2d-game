import { toggleGameFullscreen } from "../utils/fullscreen.js";
import { SAVE_KEY, SAVE_KEY_V1 } from "../config/save.js";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("mainMenu");
  }

  create() {
    const { width, height } = this.scale;
    this.input.setDefaultCursor("default");

    this.fullscreenKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.F
    );
    this.fullscreenAltKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.P
    );

    this.add
      .rectangle(0, 0, width, height, 0x0e1320, 1)
      .setOrigin(0)
      .setScrollFactor(0);

    this.add
      .text(width * 0.5, 130, "Swordigo Clone", {
        fontFamily: "Courier New",
        fontSize: "58px",
        color: "#f8f0ff",
        fontStyle: "bold",
        stroke: "#384a7a",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(width * 0.5, 200, "Action aventure 2D", {
        fontFamily: "Courier New",
        fontSize: "20px",
        color: "#9ec4ff",
      })
      .setOrigin(0.5);

    const startButton = this.createButton(
      width * 0.5,
      height * 0.5 - 20,
      "Commencer l'aventure"
    );
    startButton.on("pointerup", () => {
      this.scene.start("game", { continueFromSave: false });
    });

    const continueButton = this.createButton(
      width * 0.5,
      height * 0.5 + 60,
      "Continuer"
    );

    const saveData = this.readSaveData();
    if (!saveData) {
      continueButton.disableInteractive();
      continueButton.setAlpha(0.45);
    } else {
      continueButton.on("pointerup", () => {
        this.scene.start("game", {
          continueFromSave: true,
          saveData,
        });
      });
    }

    const fsBtn = this.createButton(
      width * 0.5,
      height * 0.5 + 130,
      "Plein ecran (F, P ou clic)"
    );
    fsBtn.on("pointerup", () => {
      toggleGameFullscreen().then(() => {
        this.time.delayedCall(80, () => this.scale.refresh());
      });
    });
  }

  update() {
    const fs =
      Phaser.Input.Keyboard.JustDown(this.fullscreenKey) ||
      Phaser.Input.Keyboard.JustDown(this.fullscreenAltKey);
    if (fs) {
      toggleGameFullscreen().then(() => {
        this.time.delayedCall(80, () => this.scale.refresh());
      });
    }
  }

  createButton(x, y, label) {
    const button = this.add
      .text(x, y, label, {
        fontFamily: "Courier New",
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#304f87",
        padding: { x: 16, y: 10 },
        stroke: "#1a2b4f",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => {
      button.setBackgroundColor("#3c63a9");
    });
    button.on("pointerout", () => {
      button.setBackgroundColor("#304f87");
    });

    return button;
  }

  readSaveData() {
    try {
      let raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        raw = localStorage.getItem(SAVE_KEY_V1);
        if (raw) {
          localStorage.setItem(SAVE_KEY, raw);
          localStorage.removeItem(SAVE_KEY_V1);
        }
      }
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }
}
