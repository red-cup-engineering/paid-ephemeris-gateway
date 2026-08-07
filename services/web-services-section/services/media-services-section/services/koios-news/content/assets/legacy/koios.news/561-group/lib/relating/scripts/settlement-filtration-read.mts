import { canonical, parse as parseJson, requireJsonValue } from "../src/codecs/path/object/attribute/file/flatfile/serialization/json/index.mjs";
import type { SettlementFiltration } from "../src/articulating/predicating/positing/settling/index.mjs";

/**
 * A public read whose domain is exactly `SettlementFiltration`.
 *
 * The codomain is intentionally generic because each read exposes a different
 * mathematical invariant or projection, but every read shares the same carrier
 * domain and the same JSON resource transport at the executable boundary.
 */
export type SettlementFiltrationRead = (carrier: SettlementFiltration) => unknown;

async function readStdin(): Promise<string> {
  let text = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

function jsonResource(value: unknown, label: string) {
  return requireJsonValue(JSON.parse(JSON.stringify(value)), label);
}

/**
 * Run a settlement-filtration read as a POSIX document morphism.
 *
 * Domain: stdin containing a JSON resource for `SettlementFiltration`.
 * Codomain: stdout containing canonical JSON for the read's result.
 * Errors are written to stderr and represented as a nonzero exit code.
 */
export async function runSettlementFiltrationRead(
  scriptName: string,
  label: string,
  read: SettlementFiltrationRead,
): Promise<number> {
  try {
    const text = await readStdin();
    const carrier = parseJson(text) as unknown as SettlementFiltration;
    const resource = read(carrier);
    process.stdout.write(`${canonical(jsonResource(resource, label))}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${scriptName}: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
