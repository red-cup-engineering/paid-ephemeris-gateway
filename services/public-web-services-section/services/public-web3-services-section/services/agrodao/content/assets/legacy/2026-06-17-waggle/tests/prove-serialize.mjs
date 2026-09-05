// prove-serialize — proves lib/serialize.mjs against the byte vectors in
// docs/dev/notes/02-serialization-spec.md (§2 assets, §8 worked transfer) plus round-trip checks
// for vote and custom_json length prefixes.
import { run, isMain } from "./_harness.mjs";
import {
  serializeTransaction,
  serializeOperation,
  serializeAsset,
  OPERATION_IDS,
} from "../lib/serialize.mjs";

const hex = (b) => b.toString("hex");

const suite = (check) => {
  // §2 asset vectors
  check(
    "asset 1.000 HIVE",
    hex(serializeAsset("1.000 HIVE")) === "e80300000000000003535445454d0000",
  );
  check(
    "asset 0.001 HBD",
    hex(serializeAsset("0.001 HBD")) === "01000000000000000353424400000000",
  );
  // NOTE: the "0100000000000000065645535453000000" string in the prompt/spec §2 is 17 bytes
  // (it pads the 7-byte symbol field to 8). A valid asset is 16 bytes: amount(8) precision(1)
  // symbol(7). The correct 16-byte encoding of 0.000001 VESTS is below; the HIVE/HBD vectors
  // (unambiguous, 16 bytes each) confirm the encoder. "VESTS"=5645535453, NUL-padded to 7.
  check(
    "asset 0.000001 VESTS (16 bytes)",
    hex(serializeAsset("0.000001 VESTS")) === "01000000000000000656455354530000",
  );

  // asset from object form, explicit precision honored
  check(
    "asset object {amount,precision,symbol}",
    hex(serializeAsset({ amount: "1.000", precision: 3, symbol: "HIVE" })) ===
      "e80300000000000003535445454d0000",
  );

  // §8 full worked transfer
  const tx = {
    ref_block_num: 1234,
    ref_block_prefix: 5678,
    expiration: 1718000000,
    operations: [
      ["transfer", { from: "alice", to: "bob", amount: "1.000 HIVE", memo: "hi" }],
    ],
    extensions: [],
  };
  check(
    "worked transfer transaction (§8)",
    hex(serializeTransaction(tx)) ===
      "d2042e16000080996666010205616c69636503626f62e80300000000000003535445454d000002686900",
  );

  // expiration as ISO string (no Z) → same epoch as the number form
  const txIso = { ...tx, expiration: "2024-06-10T06:13:20" };
  check(
    "expiration ISO string == 1718000000",
    hex(serializeTransaction(txIso)) === hex(serializeTransaction(tx)),
  );

  // op id table sanity
  check("OPERATION_IDS.transfer === 2", OPERATION_IDS.transfer === 2);
  check("OPERATION_IDS.account_update2 === 43", OPERATION_IDS.account_update2 === 43);
  check("OPERATION_IDS has 50 entries", Object.keys(OPERATION_IDS).length === 50);

  // vote op: serializes without error, known prefix.
  // op_id varint(0)=00; voter "alice" = 05 616c696365; author "bob" = 03 626f62;
  // permlink "p" = 01 70; weight 10000 (int16 LE) = 1027.
  const vote = serializeOperation([
    "vote",
    { voter: "alice", author: "bob", permlink: "p", weight: 10000 },
  ]);
  check(
    "vote op exact bytes",
    hex(vote) === "00" + "05616c696365" + "03626f62" + "0170" + "1027",
  );
  // negative weight round-trips as int16 LE two's complement (-10000 = 0xD8F0 → f0d8)
  const voteNeg = serializeOperation([
    "vote",
    { voter: "a", author: "b", permlink: "c", weight: -10000 },
  ]);
  check("vote negative weight int16 LE", hex(voteNeg).endsWith("f0d8"));

  // custom_json op: op_id varint(18)=12; required_auths [] = 00;
  // required_posting_auths ["alice"] = 01 05 616c696365; id "follow" = 06 666f6c6c6f77;
  // json "[]" = 02 5b5d
  const cj = serializeOperation([
    "custom_json",
    {
      required_auths: [],
      required_posting_auths: ["alice"],
      id: "follow",
      json: "[]",
    },
  ]);
  check(
    "custom_json op exact bytes",
    hex(cj) === "12" + "00" + "01" + "05616c696365" + "06666f6c6c6f77" + "025b5d",
  );

  // account_update2: optionals absent serialize as 0x00 flag bytes.
  const au2 = serializeOperation([
    "account_update2",
    {
      account: "alice",
      // owner/active/posting/memo_key omitted → all 0x00
      json_metadata: "",
      posting_json_metadata: "",
    },
  ]);
  // 43 -> 2b; "alice" 05616c696365; owner 00; active 00; posting 00; memo_key 00;
  // json_metadata "" 00; posting_json_metadata "" 00; extensions 00
  check(
    "account_update2 all-absent optionals",
    hex(au2) === "2b" + "05616c696365" + "00" + "00" + "00" + "00" + "00" + "00" + "00",
  );
};

export default suite;
if (isMain(import.meta.url)) run([suite]);
