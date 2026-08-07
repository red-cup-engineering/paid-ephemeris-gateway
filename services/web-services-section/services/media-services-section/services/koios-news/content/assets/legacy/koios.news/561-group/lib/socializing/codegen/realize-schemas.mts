/**
 * codegen/realize-schemas — schema → carrier type, as a build step.
 *
 * The schema-first inversion: an `object.schema.json` is the single source of a
 * carrier; its TypeScript type is the FORGETFUL functor
 * `realize: Sub(J) → StructuralTypes`, printed by `generateDeclaration`. This walks
 * `src/` for every `*.schema.json` and writes `<base>.schema.types.mts` beside it,
 * a type-only module the source imports with `import type`. The generated file is
 * never hand-edited and is regenerated before every `check`/`build`, so altering or
 * deleting a schema changes (or breaks) the build accordingly — the schema, not a
 * parallel hand-written interface, is the law.
 *
 * Build-time only: it runs from its own tsconfig (`tsconfig.codegen.json`). It
 * imports `generateDeclaration` from the published `@emsenn/relating/typing`
 * entry (socializing has no local typing functor). It anchors on `process.cwd()`
 * (the package dir, where pnpm runs scripts), not its own dist location, so it
 * writes into the real `src/` tree.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { generateDeclaration } from "@emsenn/relating/typing";

const srcDir = join(process.cwd(), "src");

/** Every `*.schema.json` under a directory, recursively. */
function* schemaFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* schemaFiles(full);
    else if (entry.name.endsWith(".schema.json")) yield full;
  }
}

/** The root type name for a schema: its `title`, else the PascalCased base name. */
function rootName(schema: { readonly title?: unknown }, base: string): string {
  if (typeof schema.title === "string" && schema.title.trim() !== "") return schema.title;
  return base
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

let written = 0;
for (const file of schemaFiles(srcDir)) {
  const schema = JSON.parse(readFileSync(file, "utf8"));
  const base = basename(file).replace(/\.schema\.json$/, "");
  const out = file.replace(/\.schema\.json$/, ".schema.types.mts");
  writeFileSync(out, generateDeclaration(schema, rootName(schema, base)));
  written += 1;
}
process.stderr.write(`realize-schemas: ${written} carrier type(s) generated from schemas\n`);
