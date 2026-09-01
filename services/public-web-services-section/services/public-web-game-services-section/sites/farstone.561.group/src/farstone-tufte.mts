import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderTufteRoomDocument } from "@red-cup-engineering/qwzspace/tufte";
import { farstoneRoomOptions } from "./web/farstone-view.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const nodeModules = join(here, "..", "node_modules", "@red-cup-engineering");

// The island's own palette over TUFTE's calm base: undyed wool and wet
// granite by day, lamplight and tarred timber after dark. Tokens only —
// the visual grammar (flat surfaces, hairline borders, quiet labels) is
// TUFTE's, and both schemes are honest, not one theme with an inversion.
const FARSTONE_STYLES = `
  :root { --tufte-bg: #eae7de; --tufte-surface: #f6f4ec; --tufte-ink: #232b2a; --tufte-muted: #5f6862; --tufte-line: #cdc9bb; --tufte-accent: #33586b; --tufte-warn: #8a6a26; --tufte-danger: #8a4a34; --farstone-log: #fdfcf4; }
  @media (prefers-color-scheme: dark) {
    :root { --tufte-bg: #171b1a; --tufte-surface: #202523; --tufte-ink: #e2ded1; --tufte-muted: #99a19a; --tufte-line: #3a413d; --tufte-accent: #88adbc; --tufte-warn: #c8a75e; --tufte-danger: #c67f62; --farstone-log: #131817; }
  }
  .tufte-shell { display: flex; flex-direction: column; min-height: 100dvh; }
  .tufte-workspace { flex: 1 1 auto; min-height: 24rem; }
  #terminal .tufte-tile-body { overflow: hidden; padding-right: 0; }
  .mud-transcript { height: 100%; overflow-y: auto; font: .92rem/1.6 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; white-space: pre-wrap; background: var(--farstone-log); border: 1px solid var(--tufte-line); border-radius: var(--tufte-radius); padding: .6rem .75rem; }
  .mud-line { min-height: 1.6em; overflow-wrap: anywhere; }
  .mud-line--command { color: var(--tufte-accent); }
  .mud-line--system, .mud-line--exits, .quiet { color: var(--tufte-muted); }
  .mud-line--room-name { font-weight: 700; margin-top: .55rem; }
  .mud-prompt { display: flex; gap: .5rem; align-items: center; height: 100%; font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; }
  .mud-prompt label { color: var(--tufte-muted); font-size: 1.1rem; }
  .mud-prompt input { flex: 1 1 auto; min-width: 6rem; font: inherit; }
  #farstone-connect label { display: block; margin-bottom: .25rem; font-size: .8rem; font-weight: 600; }
  #farstone-connect input { width: 100%; margin-bottom: .5rem; }
  .room-name { font-family: ui-serif, Georgia, serif; font-size: 1.05rem; font-weight: 650; margin: 0 0 .4rem; }
  .room-description { margin: 0 0 .55rem; }
  .room-exits { display: flex; flex-wrap: wrap; gap: .35rem; margin: .3rem 0 0; }
  .room-exits button { padding: .25rem .6rem; font-size: .85rem; }
  @media (max-width: 760px) {
    .tufte-shell { min-height: 0; }
    .tufte-workspace { min-height: 0; }
    .mud-transcript { height: auto; max-height: 55vh; }
  }
`;

export function renderFarstonePage(): string {
  return renderTufteRoomDocument(farstoneRoomOptions(null), {
    documentTitle: "Farstone — 561 Group",
    themeColor: "#33586b",
    headHtml: `<meta name="description" content="Enter Farstone, a living harbor MUD rendered through QwzSpace and TUFTE on the FeltOS world kernel."><script type="importmap">{"imports":{"@red-cup-engineering/web-tufte-gui-services-section":"/vendor/tufte/render-tufte-document.mjs"}}</script>`,
    styles: FARSTONE_STYLES,
    clientScript: `import "/assets/farstone-client.mjs";`,
  });
}

export function farstoneStaticFiles(): Record<string, string> {
  return {
    "/assets/farstone-client.mjs": join(here, "web", "farstone-client.mjs"),
    "/assets/farstone-view.mjs": join(here, "web", "farstone-view.mjs"),
    "/vendor/qwzspace/client-browser.mjs": join(nodeModules, "qwzspace", "src", "client-browser.mjs"),
    "/vendor/qwzspace/client.mjs": join(nodeModules, "qwzspace", "src", "client.mjs"),
    "/vendor/qwzspace/protocol.mjs": join(nodeModules, "qwzspace", "src", "protocol.mjs"),
    "/vendor/qwzspace/tufte.mjs": join(nodeModules, "qwzspace", "src", "tufte.mjs"),
    "/vendor/tufte/render-tufte-document.mjs": join(nodeModules, "web-tufte-gui-services-section", "src", "render-tufte-document.mjs"),
    "/vendor/tufte/tufte-browser.mjs": join(nodeModules, "web-tufte-gui-services-section", "src", "tufte-browser.mjs"),
    "/vendor/tufte/tufte-topology.mjs": join(nodeModules, "web-tufte-gui-services-section", "src", "tufte-topology.mjs"),
  };
}
