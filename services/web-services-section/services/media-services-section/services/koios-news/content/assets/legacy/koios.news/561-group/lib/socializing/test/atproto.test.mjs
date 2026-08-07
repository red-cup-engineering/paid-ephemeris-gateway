import { test } from "node:test";
import assert from "node:assert/strict";

import { canonical, valueOf } from "@emsenn/relating";
import {
  atLexiconCarrier,
  atRepo,
  atRepoCommit,
  atRepoFromWitnessLog,
  carrierFromLexiconRecord,
  crdtStateFromAtRepo,
  firehoseFromAtRepo,
  mergeAtRepos,
  mergeCrdtStates,
  sameAtprotoProjection,
  witnessLogFromAtRepo,
} from "../dist/index.mjs";

const same = (left, right) => assert.equal(canonical(left), canonical(right));

const note = (text) => Object.freeze({
  $type: "group.example.note",
  text,
  createdAt: "2026-06-26T00:00:00.000Z",
});

const repoWithNote = (text, rev, cid) => atRepo("did:plc:alice", [
  atRepoCommit({
    did: "did:plc:alice",
    rev,
    data: `bafy-${rev}`,
    sig: `sig-${rev}`,
    ops: Object.freeze([{
      action: "create",
      path: "group.example.note/3kq-test",
      cid,
      record: note(text),
    }]),
  }),
]);

test("AT repo commits round-trip as an observer-scoped RWIL witness log", () => {
  const repo = repoWithNote("first witness", "3kq-a", "bafy-record-a");

  const log = witnessLogFromAtRepo(repo);
  const roundTripped = atRepoFromWitnessLog(log);
  const firehose = firehoseFromAtRepo(repo, { startSeq: 10, time: "2026-06-26T00:00:00.000Z" });

  assert.equal(log.length, 1);
  assert.equal(log[0].t.rev, "3kq-a");
  assert.equal(log[0].t.sig, "sig-3kq-a");
  assert.equal(firehose[0].repo, "did:plc:alice");
  assert.equal(firehose[0].seq, 10);
  same(roundTripped, repo);
});

test("AT Lexicon record definitions validate through carrierFrom", () => {
  const lexicon = Object.freeze({
    lexicon: 1,
    id: "group.example.note",
    defs: Object.freeze({
      main: Object.freeze({
        type: "record",
        key: "tid",
        record: Object.freeze({
          type: "object",
          properties: Object.freeze({
            text: Object.freeze({ type: "string", required: true, minLength: 1 }),
            createdAt: Object.freeze({ type: "string", required: true }),
          }),
        }),
      }),
    }),
  });

  assert.equal(atLexiconCarrier.validate(lexicon), true);
  const noteCarrier = carrierFromLexiconRecord(lexicon);

  assert.equal(noteCarrier.validate(note("typed carrier")), true);
  assert.equal(noteCarrier.validate({ $type: "group.example.note", createdAt: "2026-06-26T00:00:00.000Z" }), false);
});

test("merge of AT repos is exactly the existing CRDT knowledge join", () => {
  const a = repoWithNote("library", "3kq-a", "bafy-record-a");
  const b = repoWithNote("cafe", "3kq-b", "bafy-record-b");
  const c = repoWithNote("garden", "3kq-c", "bafy-record-c");
  const aState = crdtStateFromAtRepo(a);
  const bState = crdtStateFromAtRepo(b);
  const cState = crdtStateFromAtRepo(c);

  assert.equal(sameAtprotoProjection(mergeAtRepos(a), aState), true);
  same(mergeAtRepos(a, a), aState);
  same(mergeAtRepos(a, b), mergeAtRepos(b, a));
  same(
    mergeCrdtStates(mergeCrdtStates(aState, bState), cState),
    mergeCrdtStates(aState, mergeCrdtStates(bState, cState)),
  );
  same(mergeAtRepos(a, b, c), mergeCrdtStates(mergeCrdtStates(aState, bState), cState));
  same(mergeAtRepos(a, b), mergeCrdtStates(aState, bState));

  const joined = mergeAtRepos(a, b);
  assert.equal(joined.cells.length, 1);
  assert.equal(valueOf(joined.cells[0].charge).name, "stable");
  assert.deepEqual(joined.cells[0].writes.map((write) => write.value.text).sort(), ["cafe", "library"]);
});
