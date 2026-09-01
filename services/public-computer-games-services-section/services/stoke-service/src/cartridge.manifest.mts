/**
 * `cartridge.manifest` — stoke's `CartridgeManifest` (per `cartridge-and-energy-bank-spec.md`
 * §1.1) and its `replayVerifier` entry point (§1.4).
 *
 * `energy` is deliberately omitted (same reasoning, and same "omit, don't stub" discipline, as
 * flickering-delve's and onestone's manifests): stoke has no real-money surface at all yet — no
 * payout, no ad settlement, nothing `@red-cup-engineering/energy-bank`'s `EnergyHooks` would wrap. If that
 * ever ships, this manifest gains an `energy` block then, not a placeholder now.
 *
 * `regime` (a computed `finite/scott/transfinite/aperiodic` field) is also omitted: it is
 * proposed but not adopted for the cartridge schema, and adding it here ahead of that decision
 * would be exactly the kind of undisclosed field the "omit, don't stub" rule exists to prevent.
 */
import type { CartridgeManifest } from "@red-cup-engineering/cartridge/manifest";
import { createVerifier } from "@red-cup-engineering/cartridge/replay";
import { applyIntent, createEngine } from "./cartridge.mts";

export const verify = createVerifier({ createEngine, applyIntent });

export const manifest: CartridgeManifest = {
  id: "stoke",
  displayName: "Stoke",
  description:
    "The kind incremental: the player builds a real production graph, and prestige is not an authored curve — it is the dominant Perron-Frobenius eigenvalue of the player's actual production matrix, computed by real linear algebra, with the prestige loadout literally the eigenvector. Every displayed number is tagged computed-from-your-graph or designed-flavor; the game never blends the two without saying so.",
  subdomain: "stoke",
  entryPoints: {
    browser: "/",
  },
  seedPolicy: { kind: "on-demand" },
  intentLog: {
    schemaVersion: "stoke-cartridge-v1",
    schemaRef: "src/intents.mts#StokeIntent",
  },
  replayVerifier: "src/cartridge.manifest.mts#verify",
  keywords: ["idle-game", "incremental", "perron-frobenius", "kind-incremental", "honest-numbers"],
};
