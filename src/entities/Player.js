import {
  PLAYER_ACCELERATION,
  PLAYER_ATTACK_COOLDOWN_MS,
  PLAYER_ATTACK_DURATION_MS,
  PLAYER_AIR_DRAG,
  PLAYER_BASE_DAMAGE,
  PLAYER_BASE_XP_TO_LEVEL,
  PLAYER_FIREBALL_COOLDOWN_MS,
  PLAYER_FIREBALL_MANA_COST,
  PLAYER_FIREBALL_SPEED,
  PLAYER_ICE_MANA_COST,
  PLAYER_ICE_SPEED,
  PLAYER_GROUND_DRAG,
  PLAYER_HIT_INVULN_MS,
  PLAYER_JUMP_VELOCITY,
  PLAYER_MANA_REGEN_PER_SEC,
  PLAYER_MAX_HP,
  PLAYER_MAX_JUMPS,
  PLAYER_MAX_MANA,
  PLAYER_SIZE,
  PLAYER_SPEED,
  PLAYER_XP_GROWTH_FACTOR,
  PLAYER_DASH_COOLDOWN_MS,
  PLAYER_DASH_DURATION_MS,
  PLAYER_DASH_SPEED,
} from "../config/constants.js";
import {
  isAttackJustPressed,
  isDashJustPressed,
  isJumpJustPressed,
  isLeftPressed,
  isRightPressed,
} from "../utils/input.js";

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "player");
    this.scene = scene;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(40, 40);
    this.setOrigin(0.5, 0.5);

    this.body.setCollideWorldBounds(true);
    this.body.setSize(16, 26);
    this.body.setOffset(10, 9);
    this.body.setMaxVelocity(PLAYER_SPEED, 1200);
    this.body.setDragX(PLAYER_GROUND_DRAG);

    this.facing = 1;
    this.isAttacking = false;
    this.nextAttackTime = 0;
    this.jumpCount = 0;
    this.wasGrounded = false;
    this.maxHp = PLAYER_MAX_HP;
    this.hp = PLAYER_MAX_HP;
    this.nextDamageTime = 0;
    this.level = 1;
    this.damage = PLAYER_BASE_DAMAGE;
    this.xp = 0;
    this.xpToNextLevel = PLAYER_BASE_XP_TO_LEVEL;
    this.maxMana = PLAYER_MAX_MANA;
    this.mana = PLAYER_MAX_MANA;
    this.nextFireballTime = 0;
    this.fireballManaCost = PLAYER_FIREBALL_MANA_COST;
    this.fireballSpeed = PLAYER_FIREBALL_SPEED;
    this.iceManaCost = PLAYER_ICE_MANA_COST;
    this.iceSpeed = PLAYER_ICE_SPEED;
    this.manaRegenMultiplier = 1;
    this.hasIceSpell = false;

    this.attackHitbox = scene.add
      .rectangle(this.x, this.y, 68, 36, 0xff6b6b, 0.01)
      .setVisible(false);
    scene.physics.add.existing(this.attackHitbox);
    this.attackHitbox.body.setAllowGravity(false);
    this.attackHitbox.body.moves = false;
    this.attackHitbox.body.enable = false;

    this.swordSlashSprite = scene.add
      .image(this.x, this.y, "swordSlash")
      .setVisible(false)
      .setDepth(8);
    this.swordSlashSprite.setDisplaySize(64, 64);

    this.swordGlowSprite = scene.add
      .image(this.x, this.y, "swordSlash")
      .setVisible(false)
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffe8a0);
    this.swordGlowSprite.setDisplaySize(78, 78);
    this.swordGlowSprite.setAlpha(0.55);

    this.isDashing = false;
    this.dashEndTime = 0;
    this.nextDashTime = 0;
  }

  update(controls, currentTime, delta) {
    this.refreshGroundedState();
    this.regenMana(delta);

    if (this.isDashing) {
      if (currentTime >= this.dashEndTime) {
        this.isDashing = false;
      } else {
        this.body.setVelocityX(this.facing * PLAYER_DASH_SPEED);
        this.updateAttackHitboxPosition();
        this.updateSwordSlashPosition();
        return;
      }
    }

    if (isDashJustPressed(controls) && currentTime >= this.nextDashTime) {
      this.isDashing = true;
      this.dashEndTime = currentTime + PLAYER_DASH_DURATION_MS;
      this.nextDashTime = currentTime + PLAYER_DASH_COOLDOWN_MS;
      this.body.setVelocityX(this.facing * PLAYER_DASH_SPEED);
      this.body.setVelocityY(0);
      this.updateAttackHitboxPosition();
      this.updateSwordSlashPosition();
      return;
    }

    this.handleHorizontalMovement(controls);
    this.handleJump(controls);
    this.handleAttack(controls, currentTime);
    this.updateAttackHitboxPosition();
    this.updateSwordSlashPosition();
  }

  regenMana(delta) {
    const amount = (PLAYER_MANA_REGEN_PER_SEC * this.manaRegenMultiplier * delta) / 1000;
    this.mana = Phaser.Math.Clamp(this.mana + amount, 0, this.maxMana);
  }

  refreshGroundedState() {
    const grounded = this.body.blocked.down || this.body.touching.down;
    if (grounded && !this.wasGrounded) {
      this.jumpCount = 0;
      if (Math.abs(this.body.velocity.y) > 80) {
        this.scene.onPlayerLanded?.(this);
      }
    }

    this.wasGrounded = grounded;
    this.body.setDragX(grounded ? PLAYER_GROUND_DRAG : PLAYER_AIR_DRAG);
  }

  handleHorizontalMovement(controls) {
    const movingLeft = isLeftPressed(controls);
    const movingRight = isRightPressed(controls);

    if (movingLeft && !movingRight) {
      this.body.setAccelerationX(-PLAYER_ACCELERATION);
      this.facing = -1;
      this.setFlipX(true);
      return;
    }

    if (movingRight && !movingLeft) {
      this.body.setAccelerationX(PLAYER_ACCELERATION);
      this.facing = 1;
      this.setFlipX(false);
      return;
    }

    this.body.setAccelerationX(0);
  }

  handleJump(controls) {
    const jumpRequested = isJumpJustPressed(controls);
    if (!jumpRequested) {
      return;
    }

    const grounded = this.body.blocked.down || this.body.touching.down;
    if (!grounded && this.jumpCount >= PLAYER_MAX_JUMPS) {
      return;
    }

    this.body.setVelocityY(PLAYER_JUMP_VELOCITY);
    this.jumpCount += 1;
    this.scene.playSfx?.("playerJump");
    this.scene.onPlayerJump?.(this);
  }

  handleAttack(controls, currentTime) {
    if (!isAttackJustPressed(controls)) {
      return;
    }

    if (currentTime < this.nextAttackTime) {
      return;
    }

    this.isAttacking = true;
    this.nextAttackTime = currentTime + PLAYER_ATTACK_COOLDOWN_MS;
    this.setTint(0xfff08a);
    this.attackHitbox.setVisible(true);
    this.attackHitbox.body.enable = true;
    this.swordSlashSprite.setVisible(true);
    this.swordSlashSprite.setAlpha(1);
    this.swordSlashSprite.setScale(1);
    this.swordSlashSprite.setFlipX(this.facing < 0);
    this.swordSlashSprite.setBlendMode(Phaser.BlendModes.SCREEN);

    this.swordGlowSprite.setVisible(true);
    this.swordGlowSprite.setAlpha(0.65);
    this.swordGlowSprite.setScale(1);
    this.swordGlowSprite.setFlipX(this.facing < 0);

    this.scene.tweens.add({
      targets: this.swordSlashSprite,
      alpha: 0,
      scaleX: 1.45,
      scaleY: 1.3,
      duration: PLAYER_ATTACK_DURATION_MS,
      ease: "Sine.Out",
    });
    this.scene.tweens.add({
      targets: this.swordGlowSprite,
      alpha: 0,
      scaleX: 1.55,
      scaleY: 1.4,
      duration: PLAYER_ATTACK_DURATION_MS,
      ease: "Sine.Out",
    });
    this.scene.playSfx?.("swordSwing");

    this.scene.time.delayedCall(PLAYER_ATTACK_DURATION_MS, () => {
      this.isAttacking = false;
      this.attackHitbox.setVisible(false);
      this.attackHitbox.body.enable = false;
      this.clearTint();
      this.swordSlashSprite.setVisible(false);
      this.swordSlashSprite.setBlendMode(Phaser.BlendModes.NORMAL);
      this.swordGlowSprite.setVisible(false);
    });
  }

  updateAttackHitboxPosition() {
    const horizontalOffset = this.facing * (PLAYER_SIZE * 1.35);
    const x = this.x + horizontalOffset;
    const y = this.y;
    this.attackHitbox.setPosition(x, y);
  }

  updateSwordSlashPosition() {
    const horizontalOffset = this.facing * (PLAYER_SIZE * 1.28);
    const sx = this.x + horizontalOffset;
    const sy = this.y - 2;
    this.swordSlashSprite.setPosition(sx, sy);
    this.swordGlowSprite.setPosition(sx, sy);
  }

  getHp() {
    return this.hp;
  }

  getMaxHp() {
    return this.maxHp;
  }

  getMana() {
    return this.mana;
  }

  getMaxMana() {
    return this.maxMana;
  }

  getManaRatio() {
    return Phaser.Math.Clamp(this.mana / this.maxMana, 0, 1);
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }

  getDamage() {
    return this.damage;
  }

  getFireballSpeed() {
    return this.fireballSpeed;
  }

  getFireballManaCost() {
    return this.fireballManaCost;
  }

  getIceSpeed() {
    return this.iceSpeed;
  }

  getLevel() {
    return this.level;
  }

  getXp() {
    return this.xp;
  }

  getXpToNextLevel() {
    return this.xpToNextLevel;
  }

  getXpRatio() {
    return Phaser.Math.Clamp(this.xp / this.xpToNextLevel, 0, 1);
  }

  gainXp(amount) {
    this.xp += amount;
    let levelUps = 0;

    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level += 1;
      this.xpToNextLevel = Math.max(
        this.xpToNextLevel + 1,
        Math.floor(this.xpToNextLevel * PLAYER_XP_GROWTH_FACTOR)
      );
      levelUps += 1;
    }

    return levelUps;
  }

  canTakeDamage(currentTime) {
    if (this.isDashing) {
      return false;
    }
    return currentTime >= this.nextDamageTime && this.hp > 0;
  }

  registerDamageTime(currentTime) {
    this.nextDamageTime = currentTime + PLAYER_HIT_INVULN_MS;
  }

  canCastFireball(currentTime) {
    return this.mana >= this.fireballManaCost && currentTime >= this.nextFireballTime;
  }

  consumeManaForFireball(currentTime) {
    if (!this.canCastFireball(currentTime)) {
      return false;
    }

    this.mana -= this.fireballManaCost;
    this.nextFireballTime = currentTime + PLAYER_FIREBALL_COOLDOWN_MS;
    return true;
  }

  canCastIceSpell(currentTime) {
    return this.hasIceSpell && this.mana >= this.iceManaCost && currentTime >= this.nextFireballTime;
  }

  consumeManaForIceSpell(currentTime) {
    if (!this.canCastIceSpell(currentTime)) {
      return false;
    }

    this.mana -= this.iceManaCost;
    this.nextFireballTime = currentTime + PLAYER_FIREBALL_COOLDOWN_MS;
    return true;
  }

  restoreVitals() {
    this.hp = this.maxHp;
    this.mana = this.maxMana;
  }

  toProgressData() {
    return {
      level: this.level,
      xp: this.xp,
      xpToNextLevel: this.xpToNextLevel,
      damage: this.damage,
      maxHp: this.maxHp,
      fireballManaCost: this.fireballManaCost,
      fireballSpeed: this.fireballSpeed,
      iceManaCost: this.iceManaCost,
      iceSpeed: this.iceSpeed,
      manaRegenMultiplier: this.manaRegenMultiplier,
      hasIceSpell: this.hasIceSpell,
    };
  }

  loadProgressData(progressData) {
    if (!progressData) {
      return;
    }

    this.level = progressData.level ?? this.level;
    this.xp = progressData.xp ?? this.xp;
    this.xpToNextLevel = progressData.xpToNextLevel ?? this.xpToNextLevel;
    this.damage = progressData.damage ?? this.damage;
    this.maxHp = progressData.maxHp ?? this.maxHp;
    this.fireballManaCost = progressData.fireballManaCost ?? this.fireballManaCost;
    this.fireballSpeed = progressData.fireballSpeed ?? this.fireballSpeed;
    this.iceManaCost = progressData.iceManaCost ?? this.iceManaCost;
    this.iceSpeed = progressData.iceSpeed ?? this.iceSpeed;
    this.manaRegenMultiplier = progressData.manaRegenMultiplier ?? this.manaRegenMultiplier;
    this.hasIceSpell = progressData.hasIceSpell ?? this.hasIceSpell;
  }

  applyStrengthUpgrade() {
    this.damage += 2;
  }

  applyMagicUpgrade() {
    this.fireballManaCost = Math.max(5, this.fireballManaCost - 3);
    this.fireballSpeed += 70;
  }

  applyHealthUpgrade() {
    this.maxHp += 1;
    this.hp = this.maxHp;
  }

  applyManaRingUpgrade() {
    this.manaRegenMultiplier += 0.2;
  }

  unlockIceSpell() {
    this.hasIceSpell = true;
  }
}
