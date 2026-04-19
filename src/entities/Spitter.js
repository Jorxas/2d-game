import { SLIME_PATROL_DISTANCE, SLIME_SPEED } from "../config/constants.js";

export class Spitter extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, patrolDistance = SLIME_PATROL_DISTANCE) {
    super(scene, x, y, "enemySlimeGreen");
    this.scene = scene;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(44, 44);
    this.setOrigin(0.5, 0.5);
    this.setTint(0xcc77aa);
    this.setDepth(8);

    this.body.setCollideWorldBounds(true);
    this.body.setSize(22, 20);
    this.body.setOffset(12, 20);

    this.originX = x;
    this.patrolDistance = patrolDistance;
    this.direction = 1;
    this.hp = 4;
    this.isDying = false;
    this.nextShotTime = 0;
    this.shotCooldown = 2200;
    this.frozenUntil = 0;
  }

  update(time) {
    if (this.isDying) {
      return;
    }

    if (time < this.frozenUntil) {
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
    this.setFlipX(this.direction < 0);
    this.body.setVelocityX(this.direction * SLIME_SPEED * 0.75);

    if (time >= this.nextShotTime) {
      this.nextShotTime = time + this.shotCooldown;
      this.scene.onSpitterShoot?.(this);
    }
  }

  takeHit(damage) {
    this.hp -= damage;
    return this.hp <= 0;
  }

  freeze(currentTime, durationMs) {
    if (this.isDying) {
      return;
    }
    this.frozenUntil = currentTime + durationMs;
    this.setTint(0x8ed6ff);
    this.scene.time.delayedCall(durationMs, () => {
      if (this.active) {
        this.setTint(0xcc77aa);
      }
    });
  }
}
