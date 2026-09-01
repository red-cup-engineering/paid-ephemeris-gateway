import {
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign,
} from "node:crypto";

const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function ed25519PrivateKey(secret) {
  const decoded = Buffer.from(secret, "base64");
  if (decoded.length !== 64 || decoded.toString("base64") !== secret) {
    throw new TypeError("CDP Ed25519 API key secret must be canonical base64 encoding of 64 bytes");
  }
  const privateKey = createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, decoded.subarray(0, 32)]),
    format: "der",
    type: "pkcs8",
  });
  const expectedPublicKey = decoded.subarray(32);
  const actualPublicKey = createPublicKey(privateKey).export({ format: "der", type: "spki" }).subarray(-32);
  if (!actualPublicKey.equals(expectedPublicKey)) {
    throw new TypeError("CDP Ed25519 API key secret contains a public key that does not match its seed");
  }
  return privateKey;
}

function signer(apiKeySecret) {
  if (typeof apiKeySecret !== "string" || apiKeySecret.length === 0) {
    throw new TypeError("CDP API key secret is required");
  }
  if (apiKeySecret.includes("-----BEGIN")) {
    const key = createPrivateKey(apiKeySecret);
    if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1") {
      throw new TypeError("CDP PEM API key secret must be one P-256 private key");
    }
    return Object.freeze({ algorithm: "ES256", key });
  }
  return Object.freeze({ algorithm: "EdDSA", key: ed25519PrivateKey(apiKeySecret) });
}

/** Create one Coinbase REST JWT bound to the exact HTTP operation. */
export function createCdpJwt({
  apiKeyId,
  apiKeySecret,
  method,
  host,
  path,
  now = Math.floor(Date.now() / 1000),
  nonce = randomBytes(16).toString("hex"),
}) {
  if (!apiKeyId) throw new TypeError("CDP API key ID is required");
  if (!/^(?:GET|POST)$/u.test(method ?? "")) throw new TypeError("CDP JWT method must be GET or POST");
  if (typeof host !== "string" || host.length === 0 || typeof path !== "string" || !path.startsWith("/")) {
    throw new TypeError("CDP JWT requires one host and absolute request path");
  }
  if (!Number.isSafeInteger(now) || now < 0) throw new TypeError("CDP JWT time must be Unix seconds");
  if (!/^[0-9a-f]{32}$/u.test(nonce)) throw new TypeError("CDP JWT nonce must be 16 bytes of lowercase hexadecimal");

  const selected = signer(apiKeySecret);
  const encodedHeader = base64url(JSON.stringify({ alg: selected.algorithm, kid: apiKeyId, typ: "JWT", nonce }));
  const encodedPayload = base64url(JSON.stringify({
    sub: apiKeyId,
    iss: "cdp",
    uris: [`${method} ${host}${path}`],
    iat: now,
    nbf: now,
    exp: now + 120,
  }));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = selected.algorithm === "EdDSA"
    ? sign(null, Buffer.from(signingInput), selected.key)
    : sign("sha256", Buffer.from(signingInput), { key: selected.key, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${base64url(signature)}`;
}
