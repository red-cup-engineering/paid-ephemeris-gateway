/**
 * `cartridge.manifest` — onestone's `CartridgeManifest` (per `cartridge-and-energy-bank-spec.md`
 * §1.1) and its `replayVerifier` entry point (§1.4). `configs` is generated directly from
 * `levels.mts::LEVELS` — all 60 shipped levels, each a legal `configId` for `cartridge.mts`'s
 * `createEngine` — rather than hand-enumerated, so this list can never drift out of sync with
 * the actual level ladder the way a hand-copied list could.
 *
 * `energy` is deliberately omitted, same reasoning as flickering-delve's manifest: `ledger.mts`/
 * `payments.mts` are real but not yet wrapped as `EnergyHooks`, and `@red-cup-engineering/energy-bank`
 * itself is not yet adopted (known-broken for consumers at 0.1.0; this manifest will gain an
 * `energy` block once a fixed version lands and the wrap is done).
 */
import type { CartridgeConfig, CartridgeManifest } from "@red-cup-engineering/cartridge/manifest";
import { createVerifier } from "@red-cup-engineering/cartridge/replay";
import { applyIntent, createEngine } from "./cartridge.mts";
import { LEVELS } from "./levels.mts";

export const verify = createVerifier({ createEngine, applyIntent });

const CHAPTER_NAMES = ["Square", "Hex", "Rhombille"] as const;

const configs: readonly CartridgeConfig[] = LEVELS.map((spec) => ({
  id: String(spec.id),
  displayName: `${CHAPTER_NAMES[spec.chapter] ?? spec.tiling} · Level ${spec.id - spec.chapter * 20}`,
  params: { tiling: spec.tiling, chapter: spec.chapter, moves: spec.moves },
}));

export const manifest: CartridgeManifest = {
  id: "onestone",
  displayName: "TileSlots",
  description:
    "A serious match-3 whose differentiator is the tessellation itself — one tiling-agnostic graph engine playing square, hex, and rhombille boards, climbing toward aperiodic tilings.",
  subdomain: "onestone",
  configs,
  entryPoints: {
    browser: "/",
    headless: "POST /session, POST /input, GET /stream (JSON-over-HTTP + SSE; no browser required)",
  },
  seedPolicy: { kind: "on-demand" },
  intentLog: {
    schemaVersion: "onestone-cartridge-v1",
    schemaRef: "src/cartridge.mts#OnestoneIntent",
  },
  replayVerifier: "src/cartridge.manifest.mts#verify",
  keywords: ["match-3", "tessellation", "puzzle", "aperiodic-tiling", "graph-engine"],
};
