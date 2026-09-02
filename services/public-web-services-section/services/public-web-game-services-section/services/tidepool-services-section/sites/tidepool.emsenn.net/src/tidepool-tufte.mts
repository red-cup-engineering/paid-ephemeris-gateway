import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderTufteRoomDocument } from "@red-cup-engineering/qwzspace/tufte";
import { tidepoolRoomOptions } from "./web/tidepool-view.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const nodeModules = join(here, "..", "node_modules", "@red-cup-engineering");

// The shore's own palette over TUFTE's calm base: sun-bleached shell and
// low-tide kelp by day, phosphorescence and deep-pool ink after dark.
// Tokens only — the visual grammar is TUFTE's, both schemes honest.
const TIDEPOOL_STYLES = `
  :root { --tufte-bg: #f4efe6; --tufte-surface: #fffaf1; --tufte-ink: #26221c; --tufte-muted: #6b6255; --tufte-line: #d8cfbe; --tufte-accent: #0d6b5e; --tufte-warn: #a3401f; --tufte-danger: #a3401f; --tidepool-log: #fffaf1; }
  @media (prefers-color-scheme: dark) {
    :root { --tufte-bg: #14171a; --tufte-surface: #1b1e1a; --tufte-ink: #e7e2d6; --tufte-muted: #8d8a7f; --tufte-line: #33332c; --tufte-accent: #5fd1bd; --tufte-warn: #e08a5c; --tufte-danger: #e08a5c; --tidepool-log: #1b1e1a; }
  }
  .tufte-shell { display: flex; flex-direction: column; min-height: 100dvh; }
  .tufte-workspace { flex: 1 1 auto; min-height: 24rem; }
  #terminal .tufte-tile-body { overflow: hidden; padding-right: 0; }
  .mud-transcript { height: 100%; overflow-y: auto; font: .92rem/1.6 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; white-space: pre-wrap; background: var(--tidepool-log); border: 1px solid var(--tufte-line); border-radius: var(--tufte-radius); padding: .6rem .75rem; }
  .mud-line { min-height: 1.6em; overflow-wrap: anywhere; }
  .mud-line--command { color: var(--tufte-accent); }
  .mud-line--system, .mud-line--exits, .quiet { color: var(--tufte-muted); }
  .mud-line--room-name { font-weight: 700; margin-top: .55rem; }
  .mud-prompt { display: flex; gap: .5rem; align-items: center; height: 100%; font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; }
  .mud-prompt label { color: var(--tufte-muted); font-size: 1.1rem; }
  .mud-prompt input { flex: 1 1 auto; min-width: 6rem; font: inherit; }
  #tidepool-connect label { display: block; margin-bottom: .25rem; font-size: .8rem; font-weight: 600; }
  #tidepool-connect input { width: 100%; margin-bottom: .5rem; }
  .room-name { font-family: ui-serif, Georgia, serif; font-size: 1.05rem; font-weight: 650; margin: 0 0 .4rem; }
  .room-description { margin: 0 0 .55rem; }
  .room-exits { display: flex; flex-wrap: wrap; gap: .35rem; margin: .3rem 0 0; }
  .room-exits button, .verb { padding: .25rem .6rem; font-size: .85rem; }
  @media (max-width: 760px) {
    .tufte-shell { min-height: 0; }
    .tufte-workspace { min-height: 0; }
    .mud-transcript { height: auto; max-height: 55vh; }
  }
`;

export function renderTidepoolPage(): string {
  return renderTufteRoomDocument(tidepoolRoomOptions(null), {
    documentTitle: "Tidepool — 561 Group",
    themeColor: "#0d6b5e",
    headHtml: `<meta name="description" content="Wade into Tidepool, an LLM-native tidal shore rendered through QwzSpace and TUFTE on the FeltOS world kernel."><script type="importmap">{"imports":{"@red-cup-engineering/web-tufte-gui-services-section":"/vendor/tufte/render-tufte-document.mjs"}}</script>`,
    styles: TIDEPOOL_STYLES,
    clientScript: `import "/assets/tidepool-client.mjs";`,
  });
}

export function tidepoolStaticFiles(): Record<string, string> {
  return {
    "/assets/tidepool-client.mjs": join(here, "web", "tidepool-client.mjs"),
    "/assets/tidepool-view.mjs": join(here, "web", "tidepool-view.mjs"),
    "/vendor/qwzspace/client-browser.mjs": join(nodeModules, "qwzspace", "src", "client-browser.mjs"),
    "/vendor/qwzspace/client.mjs": join(nodeModules, "qwzspace", "src", "client.mjs"),
    "/vendor/qwzspace/protocol.mjs": join(nodeModules, "qwzspace", "src", "protocol.mjs"),
    "/vendor/qwzspace/tufte.mjs": join(nodeModules, "qwzspace", "src", "tufte.mjs"),
    "/vendor/tufte/render-tufte-document.mjs": join(nodeModules, "web-tufte-gui-services-section", "src", "render-tufte-document.mjs"),
    "/vendor/tufte/tufte-browser.mjs": join(nodeModules, "web-tufte-gui-services-section", "src", "tufte-browser.mjs"),
    "/vendor/tufte/tufte-topology.mjs": join(nodeModules, "web-tufte-gui-services-section", "src", "tufte-topology.mjs"),
  };
}
