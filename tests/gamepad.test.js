import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeGamepad } from '../src/gamepad.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≈ ${expected}`);
function pad(axes = [0, 0, 0, 0], held = []) {
  return {
    connected: true,
    mapping: 'standard',
    axes,
    buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: held.includes(index), value: held.includes(index) ? 1 : 0 })),
  };
}

test('radial deadzone suppresses drift and rescales the remaining stick travel', () => {
  assert.deepEqual(decodeGamepad(pad([.1, .1, -.1, .1])).move, { x: 0, z: 0 });
  assert.deepEqual(decodeGamepad(pad([.18, 0, 0, -.18])).look, { x: 0, y: 0 });
  const frame = decodeGamepad(pad([.59, 0, 0, 0]));
  close(frame.move.x, .5);
  close(frame.move.z, 0);
  assert.ok(decodeGamepad(pad([.15, .15])).move.x > 0, 'radial distance determines the deadzone');
});

test('movement uses the full travel and normalizes diagonals', () => {
  assert.deepEqual(decodeGamepad(pad([0, -1])).move, { x: 0, z: 1 });
  const backwardDiagonal = decodeGamepad(pad([-1, 1])).move;
  close(backwardDiagonal.x, -Math.SQRT1_2);
  close(backwardDiagonal.z, -Math.SQRT1_2);
  const diagonal = decodeGamepad(pad([1, -1])).move;
  close(Math.hypot(diagonal.x, diagonal.z), 1);
  assert.deepEqual(decodeGamepad(pad([2, -3])).move, diagonal, 'out-of-range axes are clamped before normalization');
});

test('camera signs, speeds and frame delta prevent large pauses from spinning the camera', () => {
  const frame = decodeGamepad(pad([0, 0, 1, -1]), [], .02);
  close(frame.look.x, -Math.SQRT1_2 * .04);
  close(frame.look.y, -Math.SQRT1_2 * .022);
  const clamped = decodeGamepad(pad([0, 0, 1, 0]), [], 100);
  close(clamped.look.x, -.1);
  for (const dt of [NaN, Infinity, -1]) {
    const look = decodeGamepad(pad([0, 0, 1, 1]), [], dt).look;
    assert.deepEqual(look, { x: 0, y: 0 });
  }
});

test('button actions fire once per press while jump remains held until release', () => {
  const source = pad([0, 0, 0, 0], [0, 5]);
  const first = decodeGamepad(source);
  assert.deepEqual(first.actions, ['jump', 'grapple']);
  assert.equal(first.jumpHeld, true);
  const held = decodeGamepad(source, first.buttons);
  assert.deepEqual(held.actions, []);
  assert.equal(held.jumpHeld, true);
  const released = decodeGamepad(pad(), held.buttons);
  assert.equal(released.jumpHeld, false);
  assert.deepEqual(decodeGamepad(source, released.buttons).actions, ['jump', 'grapple']);
});

test('all standard actions and menu commands map to their documented buttons', () => {
  const frame = decodeGamepad(pad([0, 0, 0, 0], Array.from({ length: 16 }, (_, i) => i)));
  assert.deepEqual(frame.actions, ['jump', 'dodge', 'attack', 'heavy', 'batarang', 'grapple', 'smoke', 'interact', 'pause', 'crouch', 'takedown', 'scan', 'slam', 'armory', 'missions']);
  assert.deepEqual(frame.menu, { up: true, down: true, left: true, right: true, confirm: true, back: true });
  const held = decodeGamepad(pad([0, 0, 0, 0], [0, 1, 12, 13, 14, 15]), frame.buttons);
  assert.ok(Object.values(held.menu).every(value => value === false));
});

test('L3 and R3 clicks trigger crouch and takedown on separate rising edges', () => {
  const moving = [0, -1, .5, 0];
  const crouch = decodeGamepad(pad(moving, [10]));
  assert.deepEqual(crouch.actions, ['crouch']);
  assert.deepEqual(crouch.move, { x: 0, z: 1 });
  assert.ok(crouch.look.x < 0, 'clicking a stick preserves its axes');
  const held = decodeGamepad(pad(moving, [10]), crouch.buttons);
  assert.deepEqual(held.actions, [], 'holding L3 cannot toggle crouch every frame');
  const takedown = decodeGamepad(pad(moving, [10, 11]), held.buttons);
  assert.deepEqual(takedown.actions, ['takedown'], 'R3 can trigger while L3 remains held');
  assert.deepEqual(decodeGamepad(pad(moving, [10, 11]), takedown.buttons).actions, []);
  const released = decodeGamepad(pad(moving), takedown.buttons);
  assert.deepEqual(decodeGamepad(pad(moving, [10, 11]), released.buttons).actions, ['crouch', 'takedown']);
});

test('analog trigger values use the press threshold and work alongside movement', () => {
  const source = pad([0, -1, .5, 0], [2]);
  source.buttons[6] = { pressed: false, value: .51 };
  source.buttons[7] = { pressed: false, value: .5 };
  const frame = decodeGamepad(source);
  assert.deepEqual(frame.actions, ['attack', 'smoke']);
  assert.deepEqual(frame.move, { x: 0, z: 1 });
  assert.ok(frame.look.x < 0);
  source.buttons[7].value = .8;
  assert.deepEqual(decodeGamepad(source, frame.buttons).actions, ['interact']);
});

test('disconnection, invalid inputs and unsupported named layouts give a neutral frame', () => {
  const neutral = decodeGamepad(null);
  assert.equal(neutral.supported, false);
  assert.deepEqual(neutral.actions, []);
  assert.deepEqual(neutral.move, { x: 0, z: 0 });
  for (const source of [undefined, {}, { ...pad(), connected: false }, { ...pad(), mapping: 'vendor-custom' }, { ...pad(), axes: null }, { ...pad(), buttons: 'invalid' }]) {
    assert.deepEqual(decodeGamepad(source), neutral);
  }
  assert.equal(decodeGamepad({ ...pad(), mapping: '' }).supported, true, 'unnamed standard-compatible layouts can be used');
});

test('malformed values cannot generate nonfinite movement, camera motion or phantom actions', () => {
  const source = pad([NaN, Infinity, undefined, -Infinity]);
  source.buttons = [null, {}, { value: NaN }, { value: Infinity }, { value: '1' }];
  const frame = decodeGamepad(source, null);
  assert.deepEqual(frame.move, { x: 0, z: 0 });
  assert.deepEqual(frame.look, { x: 0, y: 0 });
  assert.deepEqual(frame.actions, []);
  assert.deepEqual(frame.buttons, [false, false, false, false, false]);
});

test('decoding never mutates inputs and returns detached button state', () => {
  const source = pad([1, -.3, 0, 0], [2]);
  source.axes = Object.freeze(source.axes);
  source.buttons.forEach(Object.freeze);
  source.buttons = Object.freeze(source.buttons);
  Object.freeze(source);
  const previous = Object.freeze(Array(16).fill(false));
  const original = structuredClone(source);
  const frame = decodeGamepad(source, previous);
  assert.deepEqual(source, original);
  assert.notEqual(frame.buttons, source.buttons);
  assert.notEqual(frame.buttons, previous);
  frame.buttons[2] = false;
  assert.equal(source.buttons[2].pressed, true);
  assert.equal(previous[2], false);
  assert.equal(decodeGamepad(source).buttons[2], true);
});
