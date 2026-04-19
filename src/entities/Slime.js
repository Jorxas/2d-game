import {
  SLIME_MAX_HP,
  SLIME_PATROL_DISTANCE,
  SLIME_SPEED,
} from "../config/constants.js";

/** Variantes visuelles + PV (2–3 boules de feu typiques avec dégâts = 1). */
export const SLIME_VARIANTS = {
  green: {
    textureKey: "enemySlimeGreen",
    maxHp: 3,
    speedMul: 1,
    variantBaseTint: null,
  },
  violet: {
    textureKey: "enemySlimeViolet",
    maxHp: 2,
    speedMul: 1.18,
    variantBaseTint: null,
  },
  amber: {
    textureKey: "enemySlimeAmber",
    maxHp: 3,
    speedMul: 0.92,
    variantBaseTint: null,
  },
};

export class Slime extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, patrolDistance = SLIME_PATROL_DISTANCE, options = {}) {
    const variantKey =
      options.variant && SLIME_VARIANTS[options.variant]
        ? options.variant
        : "green";
    const def = SLIME_VARIANTS[variantKey];
    const maxHp = options.maxHp ?? def.maxHp ?? SLIME_MAX_HP;

    super(scene, x, y, def.textureKey);
    this.scene = scene;
    this.variantKey = variantKey;
    this.speedMul = def.speedMul;
    this.variantBaseTint = def.variantBaseTint ?? null;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(46, 46);
    if (this.variantBaseTint != null) {
      this.setTint(this.variantBaseTint);
    }

    this.setOrigin(0.5, 0.5);

    this.body.setCollideWorldBounds(true);
    this.body.setSize(22, 20);
    this.body.setOffset(12, 20);
    this.body.setMaxVelocity(120, 1200);

    this.originX = x;
    this.patrolDistance = patrolDistance;
    this.direction = 1;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.hitStunUntil = 0;
    this.frozenUntil = 0;
    this.isDying = false;

    this.hpBarBg = scene.add
      .rectangle(x, y - 38, 40, 6, 0x1a1a1a, 0.92)
      .setStrokeStyle(1, 0x000000, 0.55)
      .setDepth(24);
    this.hpBarFill = scene.add
      .rectangle(x - 19, y - 38, 36, 4, 0x33dd66, 1)
      .setOrigin(0, 0.5)
      .setDepth(25);
    this.updateHealthBar();
  }

  updateHealthBar() {
    if (!this.hpBarBg || !this.hpBarFill || !this.active) {
      return;
    }
    const ratio = this.maxHp > 0 ? Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1) : 0;
    this.hpBarBg.setPosition(this.x, this.y - 38);
    this.hpBarFill.setPosition(this.x - 19, this.y - 38);
    this.hpBarFill.width = Math.max(0, 36 * ratio);
    const color =
      ratio > 0.35 ? 0x33dd66 : ratio > 0.15 ? 0xffcc33 : 0xff3333;
    this.hpBarFill.setFillStyle(color, 1);
    this.hpBarBg.setVisible(!this.isDying && this.hp > 0);
    this.hpBarFill.setVisible(!this.isDying && this.hp > 0);
  }

  restoreVariantTint() {
    if (!this.active || this.isDying) {
      return;
    }
    if (this.scene.time.now < this.frozenUntil) {
      return;
    }
    if (this.variantBaseTint != null) {
      this.setTint(this.variantBaseTint);
    } else {
      this.clearTint();
    }
  }

  update(time) {
    if (this.isDying) {
      if (this.hpBarBg) {
        this.hpBarBg.setVisible(false);
      }
      if (this.hpBarFill) {
        this.hpBarFill.setVisible(false);
      }
      return;
    }

    this.updateHealthBar();

    if (time < this.frozenUntil) {
      this.body.setVelocityX(0);
      return;
    }

    if (time < this.hitStunUntil) {
      this.body.setVelocityX(0);
      return;
    }

    const minX = this.originX - this.patrolDistance;
    const maxX = this.originX + this.patrolDistance;

    if (this.x <= minX) {
      this.direction = 1;
    } else if (this.x >= maxX) {
      this.direction = -1;
    }

    const vx = this.direction * SLIME_SPEED * this.speedMul;
    this.body.setVelocityX(vx);
  }

  takeHit(damage) {
    this.hp -= damage;
    this.updateHealthBar();
    return this.hp <= 0;
  }

  applyKnockback(currentTime, velocityX, velocityY, stunDurationMs = 220) {
    this.hitStunUntil = currentTime + stunDurationMs;
    this.body.setVelocityX(velocityX);
    this.body.setVelocityY(velocityY);
  }

  freeze(currentTime, durationMs) {
    if (this.isDying) {
      return;
    }
    this.frozenUntil = currentTime + durationMs;
    this.setTint(0x8ed6ff);
    this.scene.time.delayedCall(durationMs, () => {
      if (this.active && currentTime + durationMs >= this.frozenUntil) {
        this.restoreVariantTint();
      }
    });
  }

  destroy(fromScene) {
    if (this.hpBarBg) {
      this.hpBarBg.destroy();
      this.hpBarBg = null;
    }
    if (this.hpBarFill) {
      this.hpBarFill.destroy();
      this.hpBarFill = null;
    }
    super.destroy(fromScene);
  }
}
