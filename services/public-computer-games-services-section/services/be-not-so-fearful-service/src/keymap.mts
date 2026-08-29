// keymap — remappable keys, with a CI-checked completeness table (solitaire-service's own
// precedent, named directly in the design): every bindable action must have a key, checked by a
// test, not left to be discovered missing at runtime by a player who can't find how to crouch.
//
// The action list is the granular key-level surface that FEEDS the movement kernel's `MoveIntent`
// axes (forward/backward -> `intent.forward`, strafeLeft/strafeRight -> `intent.strafe`) plus the
// discrete action intents (jump/fire/altFire/interact/sprint/crouch) hum.mts's `noiseOf` and
// economy/combat read directly. `DEFAULT_KEYMAP` is a real, complete binding out of the box; a
// player's remap is just a different complete `Keymap`, validated by the same `validateKeymap` this
// file's own test suite runs against the default.

export const ACTIONS = [
  "moveForward",
  "moveBackward",
  "strafeLeft",
  "strafeRight",
  "jump",
  "fire",
  "altFire",
  "interact",
  "sprint",
  "crouch",
] as const;

export type Action = (typeof ACTIONS)[number];

export type Keymap = Record<Action, string>;

// browser `KeyboardEvent.code` values (layout-independent) for every action except fire/altFire,
// which default to the mouse (a code-shaped sentinel the browser face's input layer recognizes
// specially, never dispatched by a real KeyboardEvent — see web/js/input.mjs).
export const DEFAULT_KEYMAP: Keymap = {
  moveForward: "KeyW",
  moveBackward: "KeyS",
  strafeLeft: "KeyA",
  strafeRight: "KeyD",
  jump: "Space",
  fire: "Mouse0",
  altFire: "Mouse1",
  interact: "KeyE",
  sprint: "ShiftLeft",
  crouch: "ControlLeft",
};

export interface KeymapValidation {
  valid: boolean;
  errors: string[];
}

/** validateKeymap(map) — every action in ACTIONS must have a non-empty bound key, and no two
 *  actions may share the same key (a remap that silently shadows another action is a real bug, not
 *  a valid configuration). Collects every error rather than failing on the first. */
export function validateKeymap(map: Partial<Keymap>): KeymapValidation {
  const errors: string[] = [];
  const seen = new Map<string, Action>();
  for (const action of ACTIONS) {
    const key = map[action];
    if (!key || key.length === 0) {
      errors.push(`${action}: must be bound to a non-empty key`);
      continue;
    }
    const clash = seen.get(key);
    if (clash) {
      errors.push(`${action}: key "${key}" is already bound to "${clash}"`);
    } else {
      seen.set(key, action);
    }
  }
  return { valid: errors.length === 0, errors };
}

/** intentFromKeymap(map, pressed) — translate a raw pressed-key set into the game's own MoveIntent
 *  shape plus the discrete action booleans, given a `Keymap`. Pure: no DOM, no event listeners —
 *  those live in web/js/input.mjs, which calls this with whatever it currently believes is pressed. */
export function intentFromKeymap(map: Keymap, pressed: ReadonlySet<string>) {
  const has = (action: Action) => pressed.has(map[action]);
  const forward = (has("moveForward") ? 1 : 0) - (has("moveBackward") ? 1 : 0);
  const strafe = (has("strafeRight") ? 1 : 0) - (has("strafeLeft") ? 1 : 0);
  return {
    forward,
    strafe,
    jump: has("jump"),
    fire: has("fire"),
    altFire: has("altFire"),
    interact: has("interact"),
    sprint: has("sprint"),
    crouch: has("crouch"),
  };
}
