/**
 * scripts/wire — process binding for animating package-bin strategies.
 *
 * The package-bin strategy law lives in ./api.mts: EAVT JSONL in, EAVT JSONL
 * out. This file only binds that pure script morphism surface to Node's
 * stdin/stdout/stderr process boundary.
 */
import { evalAnimation, type ScriptAction } from "./api.mjs";

/** Read all of stdin as UTF-8 — one complete boundary document. */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/** Run one package-bin script morphism against stdin and write its carrier output. */
export async function runScript(action: ScriptAction): Promise<number> {
  const tokenDocument = await readStdin();
  process.stdout.write(evalAnimation(action, tokenDocument));
  return 0;
}

export type { ScriptAction };
