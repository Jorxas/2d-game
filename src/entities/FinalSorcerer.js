export class FinalSorcerer extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "finalSorcerer");
    this.scene = scene;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(2.8);
    this.setDepth(10);
    this.body.setCollideWorldBounds(true);
    this.body.setSize(14, 20);
    this.body.setOffset(5, 4);
    this.body.setAllowGravity(true);

    this.maxHp = 90;
    this.hp = this.maxHp;
    this.phase = 1;
    this.isDead = false;
    this.didSummonShadows = false;
    this.nextTeleportTime = 1400;
    this.nextFireballTime = 800;
    this.nextDashTime = 0;
    this.isDashing = false;
    this.dashStopTime = 0;
  }

  update(time, player) {
    if (this.isDead || !player) {
      return;
    }

    if (this.hp <= this.maxHp * 0.1) {
      this.phase = 3;
    } else if (this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
    }

    if (this.phase >= 2 && !this.didSummonShadows) {
      this.didSummonShadows = true;
      this.scene.onFinalBossSummonShadows(this);
    }

    if (this.phase === 3) {
      this.handlePhaseThree(time, player);
      return;
    }

    const direction = player.x < this.x ? -1 : 1;
    this.setFlipX(direction < 0);
    this.body.setVelocityX(direction * (this.phase === 2 ? 70 : 45));

    const teleportCooldown = this.phase === 1 ? 1900 : 1300;
    if (time >= this.nextTeleportTime) {
      this.teleportNearPlayer(player);
      this.nextTeleportTime = time + teleportCooldown;
    }

    const fireballCooldown = this.phase === 1 ? 1200 : 750;
    if (time >= this.nextFireballTime) {
      this.scene.spawnFinalBossFireball(this, player);
      this.nextFireballTime = time + fireballCooldown;
    }
  }

  handlePhaseThree(time, player) {
    if (this.isDashing) {
      if (time >= this.dashStopTime) {
        this.isDashing = false;
        this.body.setVelocityX(0);
      }
      return;
    }

    if (time >= this.nextDashTime) {
      const direction = player.x < this.x ? -1 : 1;
      this.setFlipX(direction < 0);
      this.body.setVelocityX(direction * 380);
      this.body.setVelocityY(-120);
      this.isDashing = true;
      this.dashStopTime = time + 320;
      this.nextDashTime = time + 850;
      return;
    }

    this.body.setVelocityX(0);
  }

  teleportNearPlayer(player) {
    const targetX = Phaser.Math.Clamp(
      player.x + Phaser.Math.Between(-240, 240),
      90,
      this.scene.physics.world.bounds.width - 90
    );
    const targetY = Phaser.Math.Clamp(player.y - Phaser.Math.Between(20, 120), 80, 620);
    this.setPosition(targetX, targetY);
    this.scene.spawnHitImpact(targetX, targetY - 24);
  }

  takeHit(damage) {
    if (this.isDead) {
      return true;
    }

    this.hp -= damage;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(90, () => {
      if (this.active && !this.isDead) {
        this.clearTint();
      }
    });

    return this.hp <= 0;
  }

  getHpRatio() {
    return Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
  }
}
