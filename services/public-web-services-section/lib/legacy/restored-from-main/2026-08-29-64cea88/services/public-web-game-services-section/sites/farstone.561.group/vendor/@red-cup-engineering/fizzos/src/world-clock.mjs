import { createHash } from "node:crypto";
import { defineCapability } from "./capabilities.mjs";
import { declareFunctional, tell, value } from "./world.mjs";

export const CLOCK = "fizzos:clock";
export const PHASE_LENGTH = 6;
export const DAY_LENGTH = PHASE_LENGTH * 4;
export const SEASON_LENGTH = DAY_LENGTH * 30;
export const TIDE_LENGTH = 8;

const PHASES = Object.freeze(["dawn", "day", "dusk", "night"]);
const SEASONS = Object.freeze(["spring", "summer", "autumn", "winter"]);
const TIDES = Object.freeze(["low", "rising", "high", "falling"]);

function integer(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} must be a nonnegative integer`);
  return value;
}

export function clockTime(world) {
  return integer(Number(value(world, CLOCK, "world-time") ?? 0), "world time");
}

export function clockSeed(world) {
  const seed = value(world, CLOCK, "world-seed");
  return typeof seed === "string" ? seed : "fizzos";
}

export function phaseAt(time) {
  return PHASES[Math.floor(integer(time, "time") / PHASE_LENGTH) % PHASES.length];
}

export function seasonAt(time) {
  return SEASONS[Math.floor(integer(time, "time") / SEASON_LENGTH) % SEASONS.length];
}

export function tideAt(time) {
  return TIDES[Math.floor(integer(time, "time") / TIDE_LENGTH) % TIDES.length];
}

function unitHash(seed, time) {
  const bytes = createHash("sha256").update(`${seed}\u0000${time}`).digest();
  return bytes.readUInt32BE(0) / 0x1_0000_0000;
}

export function weatherAt(seed, time) {
  const sample = unitHash(seed, integer(time, "time"));
  const season = seasonAt(time);
  const rainBias = season === "spring" ? 0.16 : season === "winter" ? 0.10 : 0;
  if (sample < 0.05 + rainBias / 3) return "storm";
  if (sample < 0.25 + rainBias) return "rain";
  if (sample > 0.92 && season === "summer") return "heat";
  return "clear";
}

export function initializeClock(world, { seed = "fizzos", time = 0 } = {}) {
  if (typeof seed !== "string" || seed.length === 0) throw new TypeError("world seed must be non-empty text");
  integer(time, "world time");
  world = declareFunctional(world, ["world-time", "world-seed", "weather", "dry-streak"]);
  return tell(world, [
    { subject: CLOCK, predicate: "world-seed", object: seed },
    { subject: CLOCK, predicate: "world-time", object: time },
    { subject: CLOCK, predicate: "weather", object: weatherAt(seed, time) },
    { subject: CLOCK, predicate: "dry-streak", object: 0 },
  ], { source: "fizzos.world-clock" });
}

export function advanceClock(world, steps = 1) {
  integer(steps, "clock steps");
  const prior = clockTime(world);
  const time = prior + steps;
  const seed = clockSeed(world);
  const weather = weatherAt(seed, time);
  const priorDry = Number(value(world, CLOCK, "dry-streak") ?? 0);
  const dryStreak = weather === "rain" || weather === "storm" ? 0 : priorDry + steps;
  return tell(declareFunctional(world, ["world-time", "world-seed", "weather", "dry-streak"]), [
    { subject: CLOCK, predicate: "world-time", object: time },
    { subject: CLOCK, predicate: "weather", object: weather },
    { subject: CLOCK, predicate: "dry-streak", object: dryStreak },
  ], { source: "fizzos.world-clock" });
}

export function clockReport(world) {
  const time = clockTime(world);
  return Object.freeze({
    time,
    phase: phaseAt(time),
    season: seasonAt(time),
    tide: tideAt(time),
    weather: value(world, CLOCK, "weather") ?? weatherAt(clockSeed(world), time),
    dryStreak: Number(value(world, CLOCK, "dry-streak") ?? 0),
  });
}

export const worldClockCapability = defineCapability({
  id: "fizzos.world-clock",
  onTick(ctx) {
    const initialized = value(ctx.world, CLOCK, "world-seed") === null
      ? initializeClock(ctx.world, { seed: ctx.game.id })
      : ctx.world;
    return { world: advanceClock(initialized) };
  },
});
