/**
 * Process transport for gaming script document morphisms.
 *
 * The script law lives in pure document morphisms: one decoded boundary
 * document in, one decoded boundary document out. This module only binds such
 * morphisms to Node's stdin/stdout process boundary.
 */
export type BoundaryDocument = string;
export type DocumentMorphism = (tokenDocument: BoundaryDocument) => BoundaryDocument;

/** Read all of stdin as UTF-8: one complete boundary document. */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/** Run one script document morphism against stdin and write its output. */
export async function runDocumentScript(morphism: DocumentMorphism): Promise<number> {
  process.stdout.write(morphism(await readStdin()));
  return 0;
}
