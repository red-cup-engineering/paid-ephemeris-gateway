import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { placeOf, tell, value, values } from "@red-cup-engineering/feltos/world";

const PERMIT = "the-dredging-permit";
const civic = (world: unknown, actor: string): boolean => {
  const room = placeOf(world, actor);
  return room !== null && values(world, room, "tag").includes("civic");
};

function petition(ctx: any) {
  if (!civic(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Petitions are filed in the civic blocks downtown.")] };
  const status = value(ctx.world, PERMIT, "decision-status");
  if (status !== "contested") return { events: [ctx.message(ctx.actor, `Application 23 is already settled (${String(status)}).`)] };
  const side = /brannaugh|clam|deny|marsh|refuse/u.test(ctx.argument) ? "denied"
    : /coilin|dredge|grant|channel/u.test(ctx.argument) ? "granted" : null;
  if (side === null) return { events: [ctx.message(ctx.actor, "Choose `petition coilin` or `petition brannaugh`.")] };
  const standing = Number(value(ctx.world, ctx.actor, "standing") ?? 0) + 40;
  const world = tell(ctx.world, [
    { subject: PERMIT, predicate: "decision-status", object: side },
    { subject: ctx.actor, predicate: "permit-resolved", object: 1 },
    { subject: ctx.actor, predicate: "standing", object: standing },
  ], { source: "farstone.petition" });
  return { world, events: [ctx.message(ctx.actor, side === "granted" ? "The dredging permit is granted; the marsh bears the cost." : "The dredging permit is denied; the clam bed is spared.")] };
}

function inspect(ctx: any) {
  if (!civic(ctx.world, ctx.actor)) return { events: [ctx.message(ctx.actor, "Re-inspections are dispatched from the civic blocks downtown.")] };
  const target = ctx.argument.trim().toLowerCase().replace(/\s+/gu, "-") || "hydrant-23";
  if (value(ctx.world, target, "water-quality") !== "contested") return { events: [ctx.message(ctx.actor, `${target} has no contested inspection.`)] };
  const pass = [...target].reduce((sum, character) => sum + character.codePointAt(0)!, 0) % 2 === 0;
  const world = tell(ctx.world, [
    { subject: target, predicate: "water-quality", object: pass ? "pass" : "fail" },
    { subject: target, predicate: "advisory", object: pass ? "clear" : "boil-water" },
  ], { source: "farstone.inspection" });
  return { world, events: [ctx.message(ctx.actor, `The re-inspection settles ${target}: ${pass ? "pass" : "fail"}.`)] };
}

export const farstoneArcCapability = defineCapability({
  id: "farstone.arcs",
  commands: { petition, inspect },
});
