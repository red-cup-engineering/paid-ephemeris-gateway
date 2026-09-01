import { defineThought } from "@red-cup-engineering/feltos/progression";

export const THOUGHTS = Object.freeze([
  defineThought({ id: "the-held-permit", duration: 20, requires: "contradiction", effects: { "faculty:logic": 2, "faculty:inland-empire": 2 } }),
  defineThought({ id: "off-season-mind", duration: 30, effects: { "faculty:endurance": 3, "faculty:empathy": -1 } }),
  defineThought({ id: "salt-in-the-blood", duration: 25, requires: "trade", effects: { "faculty:shivers": 2, "faculty:perception": 2 } }),
  defineThought({ id: "grey-eyed-lady", duration: 30, requires: "chapel", effects: { "faculty:shivers": 1, "faculty:empathy": 2 } }),
  defineThought({ id: "marsh-knowing", duration: 30, requires: "marsh", effects: { "faculty:inland-empire": 3, "faculty:logic": -1 } }),
]);
