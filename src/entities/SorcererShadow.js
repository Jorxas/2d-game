export class SorcererShadow extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "finalSorcerer");
    this.scene = scene;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(2.3);
    this.setAlpha(0.65);
    this.setTint(0x8f7cff);
    this.setDepth(9);
    this.body.setCollideWorldBounds(true);
    this.body.setSize(14, 20);
    this.body.setOffset(5, 4);
    this.body.setAllowGravity(true);

    this.hp = 6;
    this.speed = 135;
    this.isDying = false;
  }

  update(player) {
    if (!this.active || this.isDying || !player) {
      return;
    }

    const direction = player.x < this.x ? -1 : 1;
    this.setFlipX(direction < 0);
    this.body.setVelocityX(direction * this.speed);
  }

  takeHit(damage) {
    this.hp -= damage;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(70, () => {
      if (this.active && !this.isDying) {
        this.setTint(0x8f7cff);
      }
    });
    return this.hp <= 0;
  }
}
