#!/usr/bin/env node
import { createContractedWitnessJournal, createRscPlatformNodeAdmissionReceiver } from "../src/platform-node-admission-receiver.mjs";

const payload = JSON.parse(Buffer.from(process.argv[2] ?? "", "base64url").toString("utf8"));
const journal = createContractedWitnessJournal(payload.witnessJournal);
const receiver = createRscPlatformNodeAdmissionReceiver({
  testOnly: true,
  configuration: payload.configuration,
  journal,
  fault: async (point) => {
    if (point === payload.exitAt) process.exit(73);
  },
});

try {
  const receipt = payload.operation === "status"
    ? await receiver.status(payload.request.idempotencyKey, payload.request)
    : await receiver.admit(payload.request);
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ name: error.name, reason: error.reason ?? null, message: error.message })}\n`);
  process.exitCode = 2;
}
