import { resolve } from "node:path";
import { start } from "@red-cup-engineering/http-server-core-service/server";

import { startFilesystemWitnessJournalProviderProcess } from "@red-cup-engineering/witness-journal-document-service/filesystem-provider";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";

import { createServer } from "./server.mjs";

const dataRoot = process.env.PAID_EPHEMERIS_DATA_ROOT;
if (!dataRoot) throw new Error("PAID_EPHEMERIS_DATA_ROOT must name the durable gateway data plate");
const witnessJournal = await startFilesystemWitnessJournalProviderProcess({
  root: process.env.WITNESS_JOURNAL_ROOT ?? resolve(dataRoot, "witness-journal"),
  port: Number(process.env.WITNESS_JOURNAL_LOCAL_PORT ?? 19763),
});
const env = { ...process.env, WITNESS_JOURNAL_DOCUMENT_AGENT: witnessJournal.agentCardUrl };
const { app, network, facilitatorUrl, payTo, prices, port } = createServer(env);
const deploymentJournal = createSemanticRecordJournal({ root: resolve(dataRoot), objectKind: "paid-ephemeris-gateway.deployment-event" });
const server = await start(app, { port, host: "0.0.0.0" });
{
  const readyRecord = { event: "paid-ephemeris-gateway-ready", port, network, facilitatorUrl, payTo, prices, witnessJournalAgent: witnessJournal.agentCardUrl };
  deploymentJournal.record({ category: "paid-ephemeris-gateway.deployment.ready", recordedAt: new Date().toISOString(), record: readyRecord, charge: { support: true, refutation: false } });
  console.log(JSON.stringify(readyRecord));
}

async function stop(signal) {
  const stoppingRecord = { event: "paid-ephemeris-gateway-stopping", signal };
  deploymentJournal.record({ category: "paid-ephemeris-gateway.deployment.stopping", recordedAt: new Date().toISOString(), record: stoppingRecord, charge: { support: true, refutation: false } });
  console.log(JSON.stringify(stoppingRecord));
  await server.close();
  await witnessJournal.close();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stop(signal).then(() => process.exit(0), (error) => {
      console.error(error);
      process.exit(1);
    });
  });
}
