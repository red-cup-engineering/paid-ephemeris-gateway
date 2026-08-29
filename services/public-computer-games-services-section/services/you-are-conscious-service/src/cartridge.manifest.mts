/**
 * `cartridge.manifest` — this game's `CartridgeManifest` and its `replayVerifier` entry point,
 * exactly Stoke's own shape (see that service's manifest for the "omit, don't stub" reasoning this
 * one inherits: no `energy` block — no real-money surface exists — and no `regime` field, per
 * DESIGN.md §6's own deliberate non-adoption of `tierReached`).
 */
import type { CartridgeManifest } from "@red-cup-engineering/cartridge/manifest";
import { createVerifier } from "@red-cup-engineering/cartridge/replay";
import { applyIntent, createEngine } from "./cartridge.mts";

export const verify = createVerifier({ createEngine, applyIntent });

export const manifest: CartridgeManifest = {
  id: "you-are-conscious",
  displayName: "You Are Conscious",
  description:
    "The idleclicker where the widget production graph is Stoke's, and the ladder you climb over it is a consciousness ladder: click makes widget, and each of ten automation tiers is a genuine cognitive capability, taught through a mechanic you operate, never a lecture box. The paperclip joke is told straight and then made to hurt exactly once, honestly, at the self-model tier.",
  subdomain: "you-are-conscious",
  entryPoints: {
    browser: "/",
  },
  seedPolicy: { kind: "on-demand" },
  intentLog: {
    schemaVersion: "you-are-conscious-cartridge-v1",
    schemaRef: "src/intents.mts#ConsciousIntent",
  },
  replayVerifier: "src/cartridge.manifest.mts#verify",
  keywords: ["idle-game", "incremental", "interactive-fiction", "kind-incremental", "honest-numbers", "goodhart"],
};
