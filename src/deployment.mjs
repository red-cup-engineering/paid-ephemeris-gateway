import { startSeavtDocumentProvider } from "@red-cup-engineering/semiotic-eavt-engineering-services-section/documents/local";

import { createServer } from "./server.mjs";

const witnessLog = await startSeavtDocumentProvider({ root: process.env.SEAVT_DOCUMENT_ROOT, port: Number(process.env.SEAVT_DOCUMENT_PORT ?? 19763) });
const env = { ...process.env, SEAVT_DOCUMENT_AGENT: witnessLog.agentCardUrl };
const { app, network, facilitatorUrl, payTo, prices, port } = createServer(env);
const server = app.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({
    event: "paid-ephemeris-gateway-ready",
    port,
    network,
    facilitatorUrl,
    payTo,
    prices,
    witnessJournalAgent: witnessLog.agentCardUrl,
  }));
});

async function stop(signal) {
  console.log(JSON.stringify({ event: "paid-ephemeris-gateway-stopping", signal }));
  await new Promise((accept) => server.close(accept));
  await witnessLog.close();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stop(signal).then(() => process.exit(0), (error) => {
      console.error(error);
      process.exit(1);
    });
  });
}
