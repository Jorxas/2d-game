import { SLIME_SPEED } from "../config/constants.js";

export class Bat extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, options = {}) {
    super(scene, x, y, "bat");
    this.scene = scene;
    this.amp = options.amp ?? 50;
    this.freq = options.speed ?? 0.0022;
    this.phase = Phaser.Math.Between(0, 628) / 100;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(36, 28);
    this.setOrigin(0.5, 0.5);
    this.setDepth(8);

    this.body.setAllowGravity(false);
    this.body.setSize(28, 20);
    this.body.setOffset(4, 4);

    this.originX = x;
    this.hp = options.maxHp ?? 2;
    this.isDying = false;
    this.patrolSpeed = SLIME_SPEED * 0.9;
    this.direction = 1;
  }

  update(time) {
    if (this.isDying) {
      return;
    }

    const t = time * this.freq + this.phase;
    this.body.setVelocityY(Math.sin(t) * 95);
    this.body.setVelocityX(this.direction * this.patrolSpeed + Math.cos(t * 0.7) * 40);

    if (this.x > this.originX + 120) {
      this.direction = -1;
      this.setFlipX(true);
    } else if (this.x < this.originX - 120) {
      this.direction = 1;
      this.setFlipX(false);
    }
  }

  takeHit(damage) {
    this.hp -= damage;
    return this.hp <= 0;
  }
}
