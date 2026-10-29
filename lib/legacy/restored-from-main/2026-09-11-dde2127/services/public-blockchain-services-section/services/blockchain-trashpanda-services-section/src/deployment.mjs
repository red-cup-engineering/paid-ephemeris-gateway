import { resolve } from "node:path";
import { startLocalWitnessJournalProviderProcess } from "@red-cup-engineering/witness-journal-document-service/local-provider";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { createServer } from "./server.mjs";

const witnessJournal = await startLocalWitnessJournalProviderProcess({ port: Number(process.env.WITNESS_JOURNAL_LOCAL_PORT ?? 19764) });
const env = { ...process.env, WITNESS_JOURNAL_RDF_AGENT: witnessJournal.agentCardUrl };
const { app, network, facilitatorUrl, payTo, price, port } = createServer(env);
const deploymentDataRoot = process.env.TRASHPANDA_SERVICES_DATA_ROOT;
const deploymentJournal = deploymentDataRoot ? createSemanticRecordJournal({ root: resolve(deploymentDataRoot), objectKind: "trashpanda-services.deployment-event" }) : null;
const server = app.listen(port, "0.0.0.0", () => {
  const readyRecord = { event: "trashpanda-services-ready", brand: "Trashpanda Services", port, network, facilitatorUrl, payTo, price, witnessJournalAgent: witnessJournal.agentCardUrl };
  deploymentJournal?.record({ category: "trashpanda-services.deployment.ready", recordedAt: new Date().toISOString(), record: readyRecord, charge: { support: true, refutation: false } });
  console.log(JSON.stringify(readyRecord));
});

async function stop(signal) {
  const stoppingRecord = { event: "trashpanda-services-stopping", signal };
  deploymentJournal?.record({ category: "trashpanda-services.deployment.stopping", recordedAt: new Date().toISOString(), record: stoppingRecord, charge: { support: true, refutation: false } });
  console.log(JSON.stringify(stoppingRecord));
  await new Promise((accept) => server.close(accept));
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
