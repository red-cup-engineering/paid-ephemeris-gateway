/**
 * vault/documents  -  reading the vault through relating's content reader + markdown codec.
 *
 * knowing re-enacts NONE of the I/O: the fs walking and confinement are relating's
 * (`@emsenn/relating/holography/projecting`  -  the one effectful binding), and decoding is
 * relating's markdown codec. knowing only NAMES the result as its carriers. A document is a
 * holography `Resource` decoded by `markdownDataform`; listing and gathering are the
 * reader's confined enumeration. (The former hand-rolled fs walk + the `find` path-scan are
 * gone  -  reading the vault belongs to relating's capability surface; `find` is proof search.)
 */
import { confine, readContentResource, listContentEntries, readContentTree } from "@emsenn/relating/holography/projecting";
import { markdown, type JsonValue } from "@emsenn/relating/codecs";
import type { Resource } from "@emsenn/relating/holography";
import type { VaultDocument } from "./document.schema.types.mjs";
import type { Listing, ListEntry } from "./listing.schema.types.mjs";

export type { Resource, VaultDocument, Listing, ListEntry };
export { confine };

/**
 * read : address  -  the document decoded by relating's markdown codec. The addressed `.md`
 * is read as a holography Resource and run through `markdownDataform`, so the carrier is the
 * *decoded* document (subject, frontmatter, body, conformance verdict, the EAVT assertions
 * the codec derives), never raw bytes. The vault-relative path is the codec witness.
 */
export function readDocument(root: string, relative: string): VaultDocument {
  const resource = readContentResource(root, relative);
  const dataform = markdown.markdownDataform(resource.content, { witness: resource.path });
  return Object.freeze({
    kind: "organizing.knowledge-vault.document" as const,
    path: resource.path,
    subject: dataform.subject,
    format: dataform.format,
    conformant: dataform.conformant,
    frontmatter: dataform.frontmatter as Readonly<Record<string, JsonValue>>,
    body: dataform.body,
    assertions: dataform.assertions.length,
  });
}

/** list : address  -  its immediate entries (relating's confined listing, at the fs grain). */
export function listEntries(root: string, relative: string): Listing {
  const entries: ListEntry[] = listContentEntries(root, relative).map((entry) => Object.freeze({ name: entry.name, kind: entry.kind }));
  return Object.freeze({ kind: "organizing.knowledge-vault.listing" as const, path: relative.trim(), entries: Object.freeze(entries) });
}

/**
 * Gather vault resources (`{ path, content }`) from an addressed region, bounded  -  the
 * discovery the memory carrier deliberately does not do itself (relating's bounded
 * content-tree read). Feeds `admitMemory`, which decodes each resource via the markdown codec.
 */
export function gatherResources(root: string, relative: string, limit = 200, maxScan = 20_000): readonly Resource[] {
  return readContentTree(root, relative, { limit, maxScan });
}
