// edge/cluster.ts — Node.js cluster manager: primary forks workers, workers serve.
//
// The cluster topology is stored in a UtteranceLog: each worker PID is a Meme.
// Worker exit records active evidence and schedules replacement. Graceful drain:
// stop accepting, finish in-flight, then exit.

import { witness, UtteranceLog } from "../internal/witness.mjs";
import type { App, StartResult } from "../types.mjs";

export type ClusterOptions = {
  workers?: number;         // default: os.cpus().length
  restartDelay?: number;    // ms before respawning a dead worker (default 1000)
  gracefulTimeoutMs?: number; // time to drain in-flight requests before kill (default 10_000)
  onWorkerStart?: (pid: number) => void;
  onWorkerExit?: (pid: number, code: number | null, signal: string | null) => void;
};

export async function clusterStart(
  app: App,
  port: number,
  startFn: (app: App, port: number) => Promise<StartResult>,
  opts: ClusterOptions = {},
): Promise<StartResult | null> {
  const cluster = await import("node:cluster");
  const os = await import("node:os");

  if (!cluster.default.isPrimary) {
    // Worker process: just start the server normally
    return startFn(app, port);
  }

  // Primary process: manage the cluster
  const numWorkers = opts.workers ?? os.default.cpus().length;
  const restartDelay = opts.restartDelay ?? 1000;
  const gracefulTimeoutMs = opts.gracefulTimeoutMs ?? 10_000;
  const store = new UtteranceLog();

  function forkWorker(): void {
    const w = cluster.default.fork();
    const pid = w.process.pid ?? 0;
    witness(store, { subject: String(pid), predicate: "worker", object: "alive" }, [true, false]);
    opts.onWorkerStart?.(pid);

    w.on("exit", (code, signal) => {
      witness(store, { subject: String(pid), predicate: "worker", object: "alive" }, [false, true]);
      opts.onWorkerExit?.(pid, code, signal);

      setTimeout(() => forkWorker(), restartDelay);
    });
  }

  for (let i = 0; i < numWorkers; i++) forkWorker();

  // Primary doesn't serve requests; return a stub StartResult
  return {
    server: null as unknown as StartResult["server"],
    port,
    address: null,
    close: async () => {
      const workers = Object.values(cluster.default.workers ?? {});
      const killTimer = setTimeout(() => {
        for (const w of workers) w?.process.kill("SIGKILL");
      }, gracefulTimeoutMs);

      await Promise.all(workers.map((w) =>
        new Promise<void>((resolve) => {
          if (!w) { resolve(); return; }
          w.disconnect();
          w.once("exit", () => resolve());
        }),
      ));
      clearTimeout(killTimer);
    },
  };
}
