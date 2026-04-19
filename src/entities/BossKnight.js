export class BossKnight extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "bossKnight");
    this.scene = scene;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(3);
    this.setDepth(9);
    this.setOrigin(0.5, 1);

    this.body.setCollideWorldBounds(true);
    this.body.setSize(14, 20);
    this.body.setOffset(5, 4);
    this.body.setMaxVelocity(240, 1400);

    this.maxHp = 40;
    this.hp = this.maxHp;
    this.walkSpeed = 72;
    this.isDead = false;
    this.isSmashing = false;
    this.nextSmashTime = 4000;
    this.didSummonAtHalf = false;
    this.frozenUntil = 0;
  }

  update(time, playerX) {
    if (this.isDead) {
      return;
    }

    if (time < this.frozenUntil) {
      this.body.setVelocityX(0);
      return;
    }

    const grounded = this.body.blocked.down || this.body.touching.down;

    if (this.isSmashing && grounded) {
      this.isSmashing = false;
      this.scene.onBossSlam(this);
      this.nextSmashTime = time + 5000;
    }

    if (!this.isSmashing && grounded && time >= this.nextSmashTime) {
      this.startSlam(playerX);
      return;
    }

    if (this.isSmashing) {
      return;
    }

    const direction = playerX < this.x ? -1 : 1;
    this.setFlipX(direction < 0);
    this.body.setVelocityX(direction * this.walkSpeed);
  }

  startSlam(playerX) {
    this.isSmashing = true;
    const direction = playerX < this.x ? -1 : 1;
    this.body.setVelocityX(direction * 130);
    this.body.setVelocityY(-760);
  }

  takeHit(damage) {
    if (this.isDead) {
      return true;
    }

    this.hp -= damage;
    this.setTint(0xffb6b6);
    this.scene.time.delayedCall(120, () => {
      if (!this.isDead) {
        this.clearTint();
      }
    });

    return this.hp <= 0;
  }

  getHpRatio() {
    return Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
  }

  freeze(currentTime, durationMs) {
    if (this.isDead) {
      return;
    }
    this.frozenUntil = currentTime + durationMs;
    this.setTint(0x8ed6ff);
    this.scene.time.delayedCall(durationMs, () => {
      if (this.active && currentTime + durationMs >= this.frozenUntil) {
        this.clearTint();
      }
    });
  }
}
