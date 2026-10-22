// world.d.ts — the Farstone-owned REST world adapter for Wheatstone.

import type { World } from "@red-cup-engineering/wheatstone/world";

export interface FarstoneWorldOpts {
  base: string;
  name?: string;
  pollMs?: number;
  fetchFn?: typeof fetch;
}

export function farstoneWorld(opts: FarstoneWorldOpts): World & {
  readonly actor: string | null;
  _poll(): Promise<void>;
};
