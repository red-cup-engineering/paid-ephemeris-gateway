import { formHbdPaymentRequirement } from "@red-cup-engineering/form-hbd-payment-requirement-service";
import { verifyHbdPayment } from "@red-cup-engineering/verify-hbd-payment-service";
import { settleHbdPurchase } from "@red-cup-engineering/settle-hbd-purchase-service";
import { executeJavascriptNodeCommand } from "@red-cup-engineering/execute-javascript-node-command-service";

/**
 * Serves one x402 hbd-transfer resource: without a `paymentClaim`, returns the 402 payment requirement; with one, independently verifies the claimed Hive transfer against two public nodes and, only once verified, settles the sale (witness record plus Beancount transaction) and runs the caller-supplied external report command to produce the sold report. Never holds a key, signs, or broadcasts a transaction; every Hive read is public and every settlement is a pure computation the caller journals.
 * @param {object} request A record with `resource` ({id, price, description?}), `sellerAccount`, `memoPrefix`, `expirySeconds`, `requestedAt`, `nonce` (used only to form a new requirement), `hiveNodes` (exactly two distinct public Hive node URLs), an optional `paymentClaim` ({requirement, claim, fixtureResponses?}, omitted meaning "no payment yet"; `fixtureResponses` replaces either node's live call for deterministic offline testing, passed straight through to `verifyHbdPayment`), an optional `reportCommand` ({command, arguments, directory}, `directory` an absolute resolved path per `execute-javascript-node-command-service`'s own admission contract; the external read-only command that produces the sold report once payment settles), and an optional `runCommand` (injectable in place of the real `executeJavascriptNodeCommand`, for offline testing only).
 * @returns {Promise<object>} A `{status, body}` pair: 402 with the payment requirement or a refusal, 502 naming a failed report command, or 200 with `{settlement, report}`.
 * @throws {TypeError} When `resource`, `sellerAccount`, or `hiveNodes` is missing or malformed (propagated from the composed operations).
 */
export async function sellHiveExitTightnessResource(request) {
  const {
    resource,
    sellerAccount,
    memoPrefix,
    expirySeconds,
    requestedAt,
    nonce,
    hiveNodes,
    paymentClaim,
    reportCommand,
    runCommand = executeJavascriptNodeCommand,
  } = request ?? {};

  if (!paymentClaim) {
    const requirement = formHbdPaymentRequirement({ resource, sellerAccount, memoPrefix, nonce, expirySeconds, requestedAt });
    return { status: 402, body: requirement };
  }

  const observedAt = new Date().toISOString();
  const verification = await verifyHbdPayment({
    requirement: paymentClaim.requirement,
    claim: paymentClaim.claim,
    nodes: hiveNodes,
    observedAt,
    ...(paymentClaim.fixtureResponses ? { fixtureResponses: paymentClaim.fixtureResponses } : {}),
  });
  if (verification.status !== "verified") {
    return { status: 402, body: verification };
  }

  const settlement = settleHbdPurchase({
    verification,
    resource,
    sellerAccount,
    date: observedAt.slice(0, 10),
  });

  if (!reportCommand) {
    return { status: 200, body: { settlement, report: null } };
  }

  const receipt = runCommand({
    type: "JavascriptNodeCommandExecutionRequest",
    version: 1,
    command: reportCommand.command,
    arguments: reportCommand.arguments,
    directory: reportCommand.directory,
    environment: null,
    input: null,
  });
  if (receipt.result.status !== 0) {
    return { status: 502, body: { error: "report-command-failed", receipt } };
  }
  return { status: 200, body: { settlement, report: JSON.parse(receipt.result.stdout) } };
}
