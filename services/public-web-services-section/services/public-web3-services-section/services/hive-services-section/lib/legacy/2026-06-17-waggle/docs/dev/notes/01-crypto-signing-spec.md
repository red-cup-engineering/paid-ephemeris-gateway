# SPEC — Hive transaction signing cryptography (pure JS, Node builtins only)

> Provenance: derived by reading the reference implementations `@hiveio/dhive` (`src/crypto.ts`, `src/client.ts`), `steemit/steem-js` (`src/auth/ecc/src/ecdsa.js`, `signature.js`), and `mahdiyari/hive-tx-js`.
> This is a *spec*, not code; flags marked **[UNCERTAIN]** / **[NOTE]** call out where references disagreed or where we are inferring.
> Implemented in `lib/secp256k1.mjs`, `lib/keys.mjs`, `lib/hash.mjs`, `lib/base58.mjs`.

Hand-rolled secp256k1 in BigInt; `node:crypto` used **only** for SHA-256, RIPEMD-160, and HMAC-SHA256.
No other dependencies.

---

## 0. Constants

### 0.1 secp256k1 curve parameters (hex)

```
p  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
a  = 0x0000000000000000000000000000000000000000000000000000000000000000   // a = 0
b  = 0x0000000000000000000000000000000000000000000000000000000000000007   // b = 7
Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
n  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141   // order of G
h  = 1                                                                    // cofactor
```

Curve equation: `y² = x³ + 7 (mod p)`.
Standard SECG secp256k1 values.

### 0.2 Hive network constants

```
WIF_VERSION_BYTE   = 0x80
ADDRESS_PREFIX     = "STM"     // mainnet
ADDRESS_PREFIX_TST = "TST"     // testnet  [NOTE] convention; see §7
CHAIN_ID_MAINNET   = "beeab0de00000000000000000000000000000000000000000000000000000000"
```

`CHAIN_ID_MAINNET` is identical in dhive `DEFAULT_CHAIN_ID` and hive-tx-js `config.chain_id`.
64 hex chars → 32 bytes.
The historic original Steem/early-Hive chain id was all-zeros; the live mainnet value starting with `beeab0de` (HF24 "Eclipse") is what current libraries ship.

### 0.3 Base58 alphabet (Bitcoin alphabet — bs58)

```
123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
```
(58 chars; omits `0`, `O`, `I`, `l`.)
Both WIF and public-key bodies use this alphabet.

---

## 1. WIF private-key decode

Reference: dhive `decodePrivate` (`crypto.ts:129-141`); identical in hive-tx-js.

Input: WIF string, e.g. `5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw`.

1. `buffer = base58_decode(wif)` → payload `[version(1)] [secret(32)] [checksum(4)]` = 37 bytes.
2. Assert `buffer[0] === 0x80` (WIF version).
  Else "private key network id mismatch".
3. `checksum = buffer[-4:]` (last 4 bytes).
4. `body = buffer[0:-4]` (version + secret, 33 bytes).
5. `checksumVerify = SHA256(SHA256(body))[0:4]` — **double SHA-256**, first 4 bytes.
6. Assert `checksum === checksumVerify`.
  Else "checksum mismatch".
7. The 32-byte secret is `body[1:]` (strip leading version byte).

Validation: the 32-byte secret `d` must satisfy `1 ≤ d < n`.
Reject `0` and `≥ n`.

### 1.1 Base58 decode (big-integer method)

```
ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

function base58_decode(str):
    num = 0n
    for ch in str:
        idx = ALPHABET.indexOf(ch); if idx < 0: error "invalid base58 char"
        num = num * 58n + BigInt(idx)
    bytes = bigint_to_bytes_be(num)              # minimal-length, no leading zero byte
    leadingZeros = count of leading '1' chars in str
    return (leadingZeros × 0x00) ++ bytes
```

### 1.2 Base58 encode

```
function base58_encode(bytes):
    num = bytes_be_to_bigint(bytes)
    out = ""
    while num > 0n: out = ALPHABET[Number(num % 58n)] + out; num = num / 58n
    for each leading 0x00 byte in bytes: out = "1" + out
    return out
```

**[NOTE]** Leading zero bytes carry no numeric value — count and re-prepend them explicitly.

---

## 2. Public key derivation (secp256k1 point multiply)

1. Interpret the 32-byte secret as BigInt `d` (big-endian).
2. Compute `Q = d · G`.
3. Compress: 33-byte `[prefix] ++ X32` where `X32 = Q.x` (32-byte BE, left-padded) and `prefix = 0x02` if `Q.y` even, `0x03` if odd.

### 2.1 Required EC primitives (BigInt, affine or Jacobian)

- `mod(x) = ((x % p) + p) % p`; `inv(x) = x^(p-2) mod p` (Fermat) or extended-Euclid.
- Double (a=0): `λ = (3·x₁²)·inv(2·y₁)`; `x₃ = λ² − 2x₁`; `y₃ = λ(x₁ − x₃) − y₁`.
- Add (P≠Q): `λ = (y₂ − y₁)·inv(x₂ − x₁)`; `x₃ = λ² − x₁ − x₂`; `y₃ = λ(x₁ − x₃) − y₁`.
- Identity (point at infinity) as a sentinel (e.g. `null`).
- Scalar multiply: double-and-add. **[NOTE]** Naive double-and-add is correct but not side-channel safe — a documented limitation, not a correctness bug.
- `pointFromX(isYOdd, x)` (decompress, for recovery §5.7): `y = (x³+7)^((p+1)/4) mod p` (works since `p ≡ 3 mod 4`); pick `y` with parity = `isYOdd`, else `p − y`.

---

## 3. Hive public-key string format

Reference: dhive `encodePublic` (`crypto.ts:97-100`) and hive-tx-js — **identical**.

```
function encodePublic(compressed33, prefix="STM"):
    checksum = RIPEMD160(compressed33)[0:4]          # FIRST 4 BYTES of ripemd160
    return prefix + base58_encode(compressed33 ++ checksum)
```

**Confirmed: the public-key checksum is RIPEMD-160 of the 33 compressed bytes, first 4 bytes — NOT SHA-256.** This is the key difference from the WIF/private checksum (double-SHA-256).

- Body to base58-encode = `compressed_pubkey(33) ++ ripemd160(compressed_pubkey)[0:4]` = 37 B.
- Prefix `"STM"`/`"TST"` is prepended to the base58 string, **not** in the checksummed bytes.
- Decode: strip 3-char prefix, base58_decode, first `len−4` = compressed key, last 4 = checksum; verify `ripemd160(key)[0:4] === checksum`.

---

## 4. The digest to sign

Reference: dhive `transactionDigest` (`crypto.ts:394-415`).

```
digest = SHA256( chain_id_bytes(32) ++ serialized_transaction_bytes )
```

- `chain_id_bytes` = hex-decode of `CHAIN_ID_MAINNET` → 32 bytes.
- `serialized_transaction_bytes` from the serialization module (see 02-serialization-spec).
- The signing function takes the resulting 32-byte SHA-256 `digest` as input (no re-hash).

---

## 5. ECDSA signing (Hive / graphene)

Two reference strategies find a canonical signature; both produce valid Hive signatures. **Recommend Strategy B (steem-js)** for a from-scratch pure-JS module — its entropy perturbation is fully specified (no dependence on libsecp256k1 internals).

### 5.0 RFC 6979 deterministic k (HMAC-SHA256)

Reference: steem-js `deterministicGenerateK` (`ecdsa.js:9-63`).

```
function rfc6979_k(hash32, d, checkSig, nonce):
    if nonce > 0:
        hash32 = SHA256( hash32 ++ (nonce × 0x00) )      # append `nonce` ZERO bytes, re-hash
    x = d_as_32_bytes_be
    v = 0x01 × 32                                         # Step B
    k = 0x00 × 32                                         # Step C
    k = HMAC_SHA256(k, v ++ 0x00 ++ x ++ hash32)          # Step D
    v = HMAC_SHA256(k, v)                                 # Step E
    k = HMAC_SHA256(k, v ++ 0x01 ++ x ++ hash32)          # Step F
    v = HMAC_SHA256(k, v)                                 # Step G
    v = HMAC_SHA256(k, v)                                 # Step H2b
    T = bytes_be_to_bigint(v)
    while T <= 0 or T >= n or not checkSig(T):            # Step H3
        k = HMAC_SHA256(k, v ++ 0x00); v = HMAC_SHA256(k, v); v = HMAC_SHA256(k, v)
        T = bytes_be_to_bigint(v)
    return T
```

### 5.1 Raw ECDSA sign given k

```
e = bytes_be_to_bigint(hash32)
Q = k · G; if Q is infinity: reject k
r = Q.x mod n; if r == 0: reject k
s = (inv(k, n) · (e + d·r)) mod n; if s == 0: reject k
# low-S (BIP62), mandatory:
if s > n/2:  s = n - s
```

### 5.2 Compact 65-byte signature layout

```
byte[0]      = headerByte           # recovery + 27 + 4   (see §5.6)
byte[1..32]  = R (32-byte BE, left-padded)
byte[33..64] = S (32-byte BE, left-padded)
```

### 5.3 Graphene canonical test (exact byte test)

dhive `isCanonicalSignature` (`crypto.ts:146-153`), verbatim:

```js
function isCanonicalSignature(signature) {
  return (
    !(signature[0] & 0x80) &&
    !(signature[0] === 0 && !(signature[1] & 0x80)) &&
    !(signature[32] & 0x80) &&
    !(signature[32] === 0 && !(signature[33] & 0x80))
  )
}
```

**Critical indexing caveat — the test runs on the 64-byte `R||S` body, NOT the 65-byte buffer.** `signature[0]` = R high byte, `signature[32]` = S high byte.
If you test the 65-byte buffer (header at index 0), use offsets `[1],[2],[33],[34]` instead. **Recommendation: run the test on the 64-byte R||S body, matching dhive exactly.**

### 5.4 The canonical retry loop

**Strategy B — steem-js (DER-length test, nonce-as-zero-bytes):**

```
nonce = 0
while true:
    (r,s) = sign(hash32, d, nonce++)            # nonce perturbs RFC6979 per §5.0; low-S applied
    if isCanonical(r,s): break                   # graphene bit-test on R||S, or DER lenR==32 && lenS==32
i = recoveryId(...); headerByte = i + 31
```

The graphene bit-test and the DER-length (`lenR==32 && lenS==32`) test accept the **same** signatures.
Apply low-S first, then test canonicality, then retry with next nonce on failure.

**[NOTE — Strategy A, dhive]:** dhive perturbs via `sha256(message ++ [++attempts])` fed as libsecp256k1 extra-entropy.
Bit-for-bit reproduction needs libsecp256k1's exact mixing; not needed for validity (any canonical low-S sig with correct recovery verifies & is accepted).

### 5.5 R/S to 32-byte fields

Each of R, S → 32-byte big-endian, left-padded with `0x00` to exactly 32 bytes.

### 5.6 Recovery id and header byte

```
headerByte = recovery_id + 27 + 4 = recovery_id + 31      # recovery_id ∈ {0,1,2,3}
```
`+27` = graphene/Bitcoin compact base; `+4` = compressed-pubkey flag (Hive always compressed).
Header byte range `31..
34` (0x1F..
0x22).
Decode: `recovery = headerByte − 31`.

### 5.7 Computing recovery_id

```
e = bytes_be_to_bigint(hash32)
for i in 0..3:
    Qprime = recoverPubKey(e, r, s, i)
    if Qprime == Q (signer's own public point): return i
error "Unable to find valid recovery factor"
```

`recoverPubKey(e, r, s, i)` (SEC1 §4.1.6):
```
isYOdd = i & 1; isSecondKey = i >> 1
x = isSecondKey ? (r + n) : r
R = pointFromX(isYOdd, x)
eNeg = (-e) mod n; rInv = inv(r, n)
Q = rInv · ( s·R + eNeg·G )
```
Shortcut: recovery low bit = parity of `R.y` (ephemeral `k·G`); high bit = whether `R.x ≥ n`.
Either approach is fine; loop-and-compare against `Q` is the safest.

---

## 6. Hex encoding into the transaction `signatures` array

- Each signature = lowercase hex of the 65-byte compact buffer (§5.2) → 130-char hex string.
- Push onto `transaction.signatures` (array of such strings).
  One entry per signing key.

---

## 7. Chain id and address prefix

- **Mainnet chain id (current):** `beeab0de00000000000000000000000000000000000000000000000000000000`.
- **Mainnet address prefix:** `STM`.
- **Testnet [UNCERTAIN]:** address prefix `TST` (convention); historically published testnet chain id `18dcf0a285365fc58b71f18b3d3fec954aa0c141c44e4e5cb4cf777b9eab274e` — **not confirmed from the three reference repos**; verify against the target testnet before use.
  Signing is identical; only the 32-byte chain_id (§4) and address prefix (§3) change.

---

## 8. node:crypto usage map

- `createHash('sha256')` → digest, WIF double-hash, RFC6979 nonce perturbation, k-derivation.
- `createHash('ripemd160')` → public-key checksum (§3). **[NOTE]** Some OpenSSL 3 default providers omit legacy RIPEMD-160; if `crypto.getHashes()` lacks it, hand-roll RIPEMD-160.
- `createHmac('sha256', key)` → RFC6979 (§5.0).
- Everything else (base58, field/point arithmetic, scalar mul, recovery, canonical loop) is hand-rolled BigInt.

---

## 9. End-to-end summary (sign one transaction)

1. Decode WIF (§1) → 32-byte secret `d`; validate `1 ≤ d < n`.
2. (optional) Derive pubkey (§2) for recovery-id comparison and/or the `STM…` address (§3).
3. Caller supplies `digest = SHA256(chain_id(32) || serialized_tx)` (§4).
4. Sign (§5): RFC6979 k, raw ECDSA, low-S, canonical retry loop, recovery id.
5. Assemble 65-byte compact sig: `headerByte=recovery+31 || R32 || S32`.
6. Hex-encode lowercase (130 chars), push to `signatures[]`.

---

## 10. Flagged uncertainties (consolidated)

1. dhive extra-entropy mixing (Strategy A) — recommend Strategy B (fully specified).
2. Canonical-test indexing — dhive indices assume the 64-byte R||S body; +1 if testing 65-byte.
3. Testnet chain id — not found in the three reference repos; `18dcf0a2…` needs confirmation.
4. RIPEMD-160 availability — may require Node's legacy OpenSSL provider / hand-roll.
5. Constant-time scalar mul — naive double-and-add is correct but not side-channel safe.
