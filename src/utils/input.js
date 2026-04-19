export function createControls(scene) {
  return {
    left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
    right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
    a: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    d: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    w: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    z: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
    x: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
    q: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
    space: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    attack: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
    dash: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
  };
}

export function isLeftPressed(controls) {
  return controls.left.isDown || controls.a.isDown;
}

export function isRightPressed(controls) {
  return controls.right.isDown || controls.d.isDown;
}

export function isJumpJustPressed(controls) {
  return Phaser.Input.Keyboard.JustDown(controls.up) ||
    Phaser.Input.Keyboard.JustDown(controls.w);
}

export function isAttackJustPressed(controls) {
  return Phaser.Input.Keyboard.JustDown(controls.space);
}

export function isSpellJustPressed(controls) {
  return Phaser.Input.Keyboard.JustDown(controls.z);
}

export function isIceSpellJustPressed(controls) {
  return Phaser.Input.Keyboard.JustDown(controls.x);
}

export function isDashJustPressed(controls) {
  return Phaser.Input.Keyboard.JustDown(controls.dash);
}
