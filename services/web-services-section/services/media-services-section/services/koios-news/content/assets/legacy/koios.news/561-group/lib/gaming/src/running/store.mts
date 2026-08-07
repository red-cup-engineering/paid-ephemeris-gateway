/**
 * store — the filesystem boundary for persistent games.
 *
 * The pure core holds running games in an immutable registry and knows nothing
 * of I/O; persistence lives here, the *only* place that touches `node:fs`.  This
 * is shared by the operational `game` scripts and the game server.  Each game is
 * persisted two ways, exactly as a ludics game has both a state and a dialogue:
 *
 *   - `<dataDir>/<id>.json` — the latest *snapshot* of the whole running game
 *     (a charge-faithful `Json` via `./snapshot.mjs`), rewritten on every
 *     transition;
 *   - `<dataDir>/<id>.log.jsonl` — an append-only log, one JSONL line per
 *     interaction/move, written with `@emsenn/gaming/encoding`
 *     `encodeLine`/`encodeLogEntry` (the persistent-log line layer) so the
 *     play's history survives as the dialogue that produced the snapshot.
 *
 * `loadComputer` loads every `<id>.json` back into a `GameComputer` via
 * `restore`; a decoded carrier is a *real* frozen carrier, not a look-alike.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { join } from "node:path";
import { encodeLine, decodeLine, encodeLogEntry } from "../encoding/index.mjs";
import type { Json, LogEntry } from "../encoding/index.mjs";
import { GameComputer } from "./computer.mjs";
import { snapshot, restore } from "./snapshot.mjs";
import type { Game } from "./game.mjs";

/** Ensure the data directory exists (recursive); idempotent. */
export function ensureDataDir(dataDir: string): void {
  mkdirSync(dataDir, { recursive: true });
}

/** Path to a game's latest-snapshot JSON file. */
export function snapshotPath(dataDir: string, id: string): string {
  return join(dataDir, `${id}.json`);
}

/** Path to a game's append-only JSONL interaction log. */
export function logPath(dataDir: string, id: string): string {
  return join(dataDir, `${id}.log.jsonl`);
}

/** Persist a game's latest snapshot to `<dataDir>/<id>.json`, overwriting. */
export function writeSnapshot(dataDir: string, game: Game): void {
  const json = snapshot(game);
  writeFileSync(snapshotPath(dataDir, game.id), `${encodeLine(json)}\n`, "utf8");
}

/** Append one tagged log entry to `<dataDir>/<id>.log.jsonl`. */
export function appendLog(dataDir: string, id: string, entry: LogEntry): void {
  const line = encodeLine(encodeLogEntry(entry));
  appendFileSync(logPath(dataDir, id), `${line}\n`, "utf8");
}

/** Read a game's JSONL log back as an array of decoded `Json` lines; missing file -> `[]`. */
export function readLog(dataDir: string, id: string): readonly Json[] {
  const p = logPath(dataDir, id);
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8");
  const out: Json[] = [];
  for (const line of raw.split("\n")) {
    if (line.trim() === "") continue;
    out.push(decodeLine(line) as Json);
  }
  return out;
}

/**
 * Load every persisted game from `dataDir` into a fresh `GameComputer`.  Only
 * `<id>.json` snapshot files are read (the `.log.jsonl` logs end in `.jsonl`,
 * so `.endsWith(".json")` naturally excludes them).  A snapshot that fails to
 * decode is skipped rather than aborting.
 */
export function loadComputer(dataDir: string): GameComputer {
  ensureDataDir(dataDir);
  const games = new Map<string, Game>();
  for (const entry of readdirSync(dataDir)) {
    if (!entry.endsWith(".json")) continue;
    try {
      const raw = readFileSync(join(dataDir, entry), "utf8");
      const game = restore(decodeLine(raw));
      games.set(game.id, game);
    } catch {
      // skip a snapshot that no longer decodes
    }
  }
  return new GameComputer(games);
}
