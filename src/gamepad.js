const DEADZONE = .18;
const ACTION_BUTTONS = [
  [0, 'jump'], [1, 'dodge'], [2, 'attack'], [3, 'heavy'],
  [4, 'batarang'], [5, 'grapple'], [6, 'smoke'], [7, 'interact'],
  [9, 'pause'], [10, 'crouch'], [11, 'takedown'],
  [12, 'scan'], [13, 'slam'], [14, 'armory'], [15, 'missions'],
];

const finite = value => typeof value === 'number' && Number.isFinite(value);
const axis = value => finite(value) ? Math.max(-1, Math.min(1, value)) : 0;
const sequence = value => value != null && typeof value !== 'string' &&
  Number.isInteger(value.length) && value.length >= 0;

function stick(x, y) {
  x = axis(x);
  y = axis(y);
  const length = Math.hypot(x, y);
  if (length <= DEADZONE) return { x: 0, y: 0 };
  const strength = (Math.min(length, 1) - DEADZONE) / (1 - DEADZONE);
  return { x: x / length * strength, y: y / length * strength };
}

function isPressed(button) {
  if (typeof button === 'number') return finite(button) && button > .5;
  return button?.pressed === true || (finite(button?.value) && button.value > .5);
}

function neutral(supported = false) {
  return {
    supported,
    move: { x: 0, z: 0 },
    look: { x: 0, y: 0 },
    actions: [],
    jumpHeld: false,
    menu: { up: false, down: false, left: false, right: false, confirm: false, back: false },
    buttons: [],
  };
}

/** Decode a standard-layout Gamepad without mutating it or the previous frame. */
export function decodeGamepad(pad, previousButtons = [], dt = .016) {
  if (!pad || pad.connected === false ||
      (pad.mapping !== 'standard' && pad.mapping !== '') ||
      !sequence(pad.axes) || !sequence(pad.buttons)) return neutral();

  const frame = neutral(true);
  frame.buttons = Array.from(pad.buttons, isPressed);
  const pressed = index => frame.buttons[index] === true && previousButtons?.[index] !== true;
  const movement = stick(pad.axes[0], pad.axes[1]);
  const aim = stick(pad.axes[2], pad.axes[3]);
  const elapsed = finite(dt) ? Math.max(0, Math.min(.05, dt)) : 0;
  frame.move.x = movement.x;
  frame.move.z = movement.y === 0 ? 0 : -movement.y;
  frame.look.x = aim.x === 0 || elapsed === 0 ? 0 : -aim.x * elapsed * 2;
  frame.look.y = aim.y === 0 || elapsed === 0 ? 0 : aim.y * elapsed * 1.1;
  frame.actions = ACTION_BUTTONS.filter(([index]) => pressed(index)).map(([, action]) => action);
  frame.jumpHeld = frame.buttons[0] === true;
  frame.menu = {
    up: pressed(12), down: pressed(13), left: pressed(14), right: pressed(15),
    confirm: pressed(0), back: pressed(1),
  };
  return frame;
}
