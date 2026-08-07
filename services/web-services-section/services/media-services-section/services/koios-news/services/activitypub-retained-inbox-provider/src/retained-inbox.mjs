import { mkdir, open, readFile } from "node:fs/promises";
import path from "node:path";

export function createRetainedInbox(filePath) {
  const resolved = path.resolve(filePath);
  let write = Promise.resolve();

  async function items() {
    let source;
    try { source = await readFile(resolved, "utf8"); }
    catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
    return source.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  }

  return Object.freeze({
    async retain(arrival) {
      if (!arrival || typeof arrival !== "object" || !arrival.jsonLd || typeof arrival.jsonLd !== "object") {
        throw new TypeError("retained inbox requires one verified ActivityPub arrival");
      }
      await mkdir(path.dirname(resolved), { recursive: true, mode: 0o700 });
      write = write.then(async () => {
        const file = await open(resolved, "a", 0o600);
        try { await file.writeFile(`${JSON.stringify(arrival.jsonLd)}\n`, "utf8"); await file.sync(); }
        finally { await file.close(); }
      });
      await write;
      return Object.freeze({ retained: true });
    },
    async list({ cursor, limit }) {
      const offset = cursor === undefined ? 0 : Number(cursor);
      if (!Number.isSafeInteger(offset) || offset < 0) throw new TypeError("retained inbox cursor is invalid");
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new TypeError("retained inbox limit is invalid");
      const newestFirst = (await items()).reverse();
      const page = newestFirst.slice(offset, offset + limit);
      const nextOffset = offset + page.length;
      return Object.freeze({ items: page, totalItems: newestFirst.length, ...(nextOffset < newestFirst.length ? { nextCursor: String(nextOffset) } : {}) });
    },
  });
}
