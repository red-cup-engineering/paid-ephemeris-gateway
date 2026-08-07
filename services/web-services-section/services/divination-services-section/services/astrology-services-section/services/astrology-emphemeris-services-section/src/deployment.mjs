import { startLocalWitnessJournalProviderProcess } from "@red-cup-engineering/witness-journal-rdf-projection-service/local-provider";

import { createServer } from "./server.mjs";

const witnessJournal = await startLocalWitnessJournalProviderProcess({ port: Number(process.env.WITNESS_JOURNAL_LOCAL_PORT ?? 19763) });
const env = { ...process.env, WITNESS_JOURNAL_RDF_AGENT: witnessJournal.agentCardUrl };
const { app, network, facilitatorUrl, payTo, prices, port } = createServer(env);
const server = app.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({
    event: "paid-ephemeris-gateway-ready",
    port,
    network,
    facilitatorUrl,
    payTo,
    prices,
    witnessJournalAgent: witnessJournal.agentCardUrl,
  }));
});

async function stop(signal) {
  console.log(JSON.stringify({ event: "paid-ephemeris-gateway-stopping", signal }));
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
