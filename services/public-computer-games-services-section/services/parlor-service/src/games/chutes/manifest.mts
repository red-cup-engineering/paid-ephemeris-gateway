/**
 * manifest.mts — Chutes & Ladders' `CartridgeManifest` (per `@red-cup-engineering/cartridge/manifest`)
 * and its `replayVerifier` entry point, matching `gambling-trainer-service/src/manifest.mts`'s
 * shape. `energy` is omitted, not stubbed: this game has no economy at all (no bankroll, no
 * spend) — it is pure chance with nothing riding on it, so there is nothing for `energy` to
 * describe.
 */
import type { CartridgeConfig, CartridgeManifest } from '@red-cup-engineering/cartridge/manifest';
import { createVerifier } from '@red-cup-engineering/cartridge/replay';
import { applyIntent, createEngine, MIN_PLAYERS, MAX_PLAYERS } from './engine.mts';

export const verify = createVerifier({ createEngine, applyIntent });

const configs: readonly CartridgeConfig[] = [
  { id: 'human,bot', displayName: '1 player vs. 1 bot', params: { players: 2 } },
  { id: 'human,bot,bot', displayName: '1 player vs. 2 bots', params: { players: 3 } },
  { id: 'human,bot,bot,bot', displayName: '1 player vs. 3 bots', params: { players: 4 } },
  { id: 'bot,bot,bot,bot', displayName: '4 bots race each other', params: { players: 4 } },
];

export const manifest: CartridgeManifest = {
  id: 'chutes',
  displayName: 'Chutes & Ladders',
  description:
    `The classic 100-square race, as a board-as-graph: a chute and a ladder are one "jump" edge, ` +
    `distinguished only by direction. ${MIN_PLAYERS}-${MAX_PLAYERS} players, any mix of humans and ` +
    `bots — and the bots are not opponents with a strategy, because there is no strategy in this ` +
    `game: a "bot" is a die with a seating position. While the race runs, the exact probability ` +
    `distribution of how many more turns each player needs is computed live and shown on screen. ` +
    `Daily-seeded: the same day produces the same race for everyone. No economy, no spend — pure chance.`,
  subdomain: 'parlor',
  configs,
  entryPoints: {
    browser: '/chutes/',
  },
  seedPolicy: { kind: 'daily-utc' },
  intentLog: {
    schemaVersion: 'chutes-cartridge-v1',
    schemaRef: 'src/games/chutes/engine.mts#applyIntent',
  },
  replayVerifier: 'src/games/chutes/manifest.mts#verify',
  keywords: ['chutes-and-ladders', 'board-race', 'board-as-graph', 'daily-puzzle', 'pure-chance', 'no-strategy'],
};
