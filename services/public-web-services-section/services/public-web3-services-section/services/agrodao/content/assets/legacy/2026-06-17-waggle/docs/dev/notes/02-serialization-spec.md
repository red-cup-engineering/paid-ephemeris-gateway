# SPEC — Hive / GRAPHENE binary serialization (pure JS, Node builtins)

> Provenance: verified against `mahdiyari/hive-tx-js` (`serializer.ts`, `ByteBuffer.ts`, `Asset.ts`, `Transaction.ts`, `config.ts`) and cross-checked against `openhive-network/dhive` (`serializer.ts`, `asset.ts`); operation field lists confirmed against dhive `operation.ts`.
> Both references are byte-for-byte identical in every respect below.
> Implemented in `lib/serialize.mjs`.
> Flags marked **[UNCERTAIN]** / **[NOTE]**.

---

## 0. Global rules

- **Endianness: little-endian for ALL fixed-width integers.** hive-tx-js builds the buffer with `ByteBuffer.
  LITTLE_ENDIAN` in `digest()` even though the class default is big-endian.
  Always LE.
- The output is a contiguous byte stream — no padding, no alignment, fields concatenated in order.

---

## 1. Primitive encodings

| Type | Encoding |
|---|---|
| **uint8 / int8** | 1 byte. |
| **uint16 / int16** | 2 bytes, LE. (int16 used for `vote.weight`) |
| **uint32 / int32** | 4 bytes, LE. |
| **int64 / uint64** | 8 bytes, LE, two's-complement. Used for asset amounts. |
| **varint (unsigned LEB128)** | array/vector counts, string byte-length prefixes, operation IDs. `while (v >= 0x80) { emit((v & 0x7f) | 0x80); v >>>= 7 } emit(v)`. 7 bits/byte, low group first, high bit set on all but last. 32-bit unsigned domain. |
| **boolean** | 1 byte: `0x01` true, `0x00` false. |
| **string** | varint(UTF-8 byte length) + raw UTF-8 bytes. Empty = `0x00`. |
| **array / vector** | varint(count) + each element in order. Empty = `0x00`. |
| **optional\<T\>** | 1 flag byte: `0x00` absent; `0x01` present + serialized T. (test `data !== undefined`) |
| **extensions (empty)** | `array<...>` empty → single `0x00`. Transaction extensions = `array<string>`, always `0x00`. |

---

## 2. Asset serialization (16 bytes)

```
int64   amount      (LE)   = round(amount * 10^precision)
uint8   precision
char[7] symbol             ASCII, NUL-padded to exactly 7 bytes
```

**CRITICAL — symbol is the legacy STEEM name, not HIVE:** before serialization map `HIVE → STEEM`, `HBD → SBD` (testnet `TESTS`/`TBD` stay).
Confirmed in both refs.
The 7-byte field contains `STEEM`/`SBD`/`VESTS`, **never** `HIVE`/`HBD`.

Precision: **HIVE/HBD = 3, VESTS = 6** (TESTS/TBD = 3).

Exact bytes: - `"1.000 HIVE"` → `e8 03 00 00 00 00 00 00` `03` `53 54 45 45 4d 00 00` = `e80300000000000003535445454d0000` - `"0.001 HBD"` → `01 00 00 00 00 00 00 00` `03` `53 42 44 00 00 00 00` = `01000000000000000353424400000000` - `"0.000001 VESTS"` → `0100000000000000` `06` `56455354530000` = `01000000000000000656455354530000` (symbol is 7 bytes: `VESTS`=`5645535453` + 2 NUL)

---

## 3. Public key serialization (inside operations)

**33 bytes, raw compressed secp256k1 point, no `STM` prefix, no checksum.** The "null" key sentinel (`…1111111114T1Anm` / JS `null`) serializes as 33 zero bytes.

---

## 4. Authority struct

```
uint32  weight_threshold
array<[string account, uint16 weight]>  account_auths
array<[pubkey(33) key, uint16 weight]>  key_auths
```
Each entry = key/account serialization immediately followed by uint16 weight.
Counts are varints.
Empty maps → `0x00`.
Example empty authority, threshold 1: `01 00 00 00` `00` `00`.

---

## 5. Transaction serialization (signing + broadcast)

```
uint16  ref_block_num        (LE)
uint32  ref_block_prefix     (LE)
uint32  expiration           (LE, unix epoch seconds)
array   operations           varint count, then each: varint(op_id) + op body
array   extensions           varint 0x00 in practice (element type string)
```

**Expiration:** wire value = unix epoch **seconds** as uint32 LE.
The reference parses an ISO string without timezone and appends `'Z'`: `floor(new Date(iso + 'Z').getTime() / 1000)`.
Treat as UTC.
Hive ISO timestamps look like `2026-06-04T12:00:00` (no trailing `Z`).

**Signing digest (NOT in broadcast JSON):**
```
preimage = chain_id (32 raw bytes) || transaction_serialization
digest   = sha256(preimage)
```
- chain_id mainnet = `beeab0de00000000000000000000000000000000000000000000000000000000`.
- Prepended only for the digest.
  Broadcast `transaction` JSON has `ref_block_num`, `ref_block_prefix`, `expiration` (ISO string), `operations`, `extensions`, `signatures` — **no chain_id**.
- `txId` = `sha256(transaction_serialization).hex.slice(0, 40)` (first 20 bytes, WITHOUT chain_id).

---

## 6. Operation ID table (verified — Hive operation variant index)

```
 0  vote                         25  recover_account
 1  comment                      26  change_recovery_account
 2  transfer                     27  escrow_transfer
 3  transfer_to_vesting          28  escrow_dispute
 4  withdraw_vesting             29  escrow_release
 5  limit_order_create           30  pow2 (legacy)
 6  limit_order_cancel           31  escrow_approve
 7  feed_publish                 32  transfer_to_savings
 8  convert                      33  transfer_from_savings
 9  account_create               34  cancel_transfer_from_savings
10  account_update               35  custom_binary
11  witness_update               36  decline_voting_rights
12  account_witness_vote         37  reset_account
13  account_witness_proxy        38  set_reset_account
14  pow (legacy)                 39  claim_reward_balance
15  custom                       40  delegate_vesting_shares
16  report_over_production       41  account_create_with_delegation
17  delete_comment               42  witness_set_properties
18  custom_json                  43  account_update2
19  comment_options              44  create_proposal
20  set_withdraw_vesting_route   45  update_proposal_votes
21  limit_order_create2          46  remove_proposal
22  claim_account                47  update_proposal
23  create_claimed_account       48  collateralized_convert
24  request_account_recovery     49  recurrent_transfer
```
IDs 0–49 are contiguous.
(Higher virtual ops exist on chain but are not user-broadcastable.)

---

## 7. Field-by-field serialization (exact order)

Body follows `varint(op_id)`.

**vote (0):** `string voter; string author; string permlink; int16 weight` (−10000..
10000).

**comment (1):** `string parent_author; string parent_permlink; string author; string permlink; string title; string body; string json_metadata`.

**transfer (2):** `string from; string to; asset amount; string memo`.

**transfer_to_vesting (3):** `string from; string to; asset amount`.

**delete_comment (17):** `string author; string permlink`.

**custom_json (18):** `array<string> required_auths; array<string> required_posting_auths; string id; string json`.

**comment_options (19):**
```
string  author
string  permlink
asset   max_accepted_payout
uint16  percent_hbd
boolean allow_votes
boolean allow_curation_rewards
array<comment_options_extension>  extensions
```
Each extension is a static-variant: `varint(variant_id)` + body. - Beneficiaries: variant id **0**, body = `array<{string account, uint16 weight}>`.
Serializes as `varint(0) varint(count)` then per beneficiary `string account` + `uint16 weight`. **[NOTE]** JSON names it `"comment_payout_beneficiaries"` but the wire id is integer `0`.

**claim_reward_balance (39):** `string account; asset reward_hive; asset reward_hbd; asset reward_vests`.

**account_update2 (43):** (memo_key optional here, unlike account_update)
```
string               account
optional<authority>  owner
optional<authority>  active
optional<authority>  posting
optional<pubkey(33)> memo_key
string               json_metadata
string               posting_json_metadata
array<void>          extensions      (always 0x00)
```

**follow / reblog** — NOT distinct ops; both are **custom_json (18)** with `id = "follow"` and a `json` string holding a 2-element array: - Follow: `["follow",{"follower":"<a>","following":"<b>","what":["blog"]}]` - Unfollow: same with `"what":[]` - Reblog: `["reblog",{"account":"<a>","author":"<author>","permlink":"<permlink>"}]`

The array is `JSON.stringify`-ed into one string, then string-serialized.
`required_posting_auths` = `[<account>]`, `required_auths` = `[]`.
(App-layer convention; serializer sees opaque string.)

---

## 8. Worked example — transfer

Inputs: from=`alice`, to=`bob`, amount=`1.000 HIVE`, memo=`hi`, ref_block_num=1234, ref_block_prefix=5678, expiration=`1718000000` (unix seconds).

| Field | Bytes (hex) |
|---|---|
| ref_block_num 1234 (uint16 LE) | `d204` |
| ref_block_prefix 5678 (uint32 LE) | `2e160000` |
| expiration 1718000000 (uint32 LE) | `80996666` |
| operations count varint(1) | `01` |
| op_id varint(2) | `02` |
| from `alice` (varint 5 + utf8) | `05 616c696365` |
| to `bob` (varint 3 + utf8) | `03 626f62` |
| amount `1.000 HIVE` (asset) | `e803000000000000 03 535445454d0000` |
| memo `hi` (varint 2 + utf8) | `02 6869` |
| extensions count varint(0) | `00` |

**Full transaction serialization (broadcast/preimage body):**
```
d2042e16000080996666010205616c69636503626f62e80300000000000003535445454d000002686900
```

**Signing digest:**
```
preimage = beeab0de…00 (32 chain_id bytes) || <full tx above>
digest   = sha256(preimage) = bdc7e9497a1adb149ccd20892fac6245a6e8b23d677a1e2a581fd217c61039f1
```
(Digest exact for these inputs with the mainnet chain_id.
These are checkable test vectors.)

---

## 9. Uncertainties / flags

1. **Asset symbol mapping (high confidence, easy to miss):** write `STEEM`/`SBD`, not `HIVE`/`HBD`.
2. **Endianness:** ByteBuffer class default is BIG-endian; correctness depends on LE.
  Hardcode LE.
3. **comment_options beneficiaries:** binary id is integer `0`; the JSON name is not on the wire.
4. **Varint width:** 32-bit unsigned (`>>> 0`).
  Fine for op-ids/lengths/counts; never for 64-bit.
5. **Expiration timezone:** treat as UTC; store epoch seconds directly to sidestep the `'Z'` issue.
6. **follow/reblog json shapes:** app-layer convention; serializer sees an opaque string.
7. **recurrent_transfer / update_proposal** have nested variant/struct extensions — out of scope.
