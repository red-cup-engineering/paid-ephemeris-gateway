import { validate } from "#engine/intents.mjs";

export function createQueue() {
  let pending = [];
  return {
    push(raw) {
      const intent = validate(raw);
      if (intent) pending.push(intent);
      return intent;
    },
    drain() {
      const result = pending;
      pending = [];
      return result;
    },
    depth: () => pending.length,
  };
}
