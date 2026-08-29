import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderTufteRoomDocument } from "@red-cup-engineering/qwzspace/tufte";
import { farstoneRoomOptions } from "./web/farstone-view.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const nodeModules = join(here, "..", "node_modules", "@red-cup-engineering");

export function renderFarstonePage(): string {
  return renderTufteRoomDocument(farstoneRoomOptions(null), {
    documentTitle: "Farstone — 561 Group",
    themeColor: "#173f3a",
    headHtml: `<meta name="description" content="Enter Farstone, a living harbor MUD rendered through QwzSpace and TUFTE on the FeltOS world kernel."><script type="importmap">{"imports":{"@red-cup-engineering/web-tufte-gui-services-section":"/vendor/tufte/render-tufte-document.mjs"}}</script>`,
    styles: `
      :root { --tufte-bg: #eef0e8; --tufte-surface: #f8f5e8; --tufte-ink: #172c2a; --tufte-accent: #a84d32; }
      body { background: radial-gradient(circle at 80% 0%, #d8d2b8, transparent 36rem), var(--tufte-bg); }
      .tufte-masthead { border-bottom-color: #71918a; }
      form { display: flex; flex-wrap: wrap; gap: .6rem; align-items: end; }
      label { display: block; width: 100%; font-size: .8rem; font-weight: 700; }
      input { flex: 1 1 18rem; padding: .72rem .8rem; border: 1px solid var(--border); background: #fffdf4; color: var(--ink); }
      button { padding: .7rem .9rem; border: 1px solid #173f3a; background: #173f3a; color: #fffdf4; cursor: pointer; }
      .mud-transcript { min-height: 24rem; max-height: 62vh; overflow-y: auto; padding: 1rem; border: 1px solid #71918a; background: #102321; color: #e8eadf; font: 1rem/1.55 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; white-space: pre-wrap; }
      .mud-line { min-height: 1.55em; }
      .mud-line--command { color: #f0c38f; }
      .mud-line--system, .mud-line--exits { color: #a8c9c1; }
      .mud-line--room-name { color: #fff7d6; font-weight: 700; margin-top: .65rem; }
      .mud-prompt { flex-wrap: nowrap; align-items: center; font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; }
      .mud-prompt label { width: auto; font-size: 1.25rem; }
      .mud-prompt input { font: inherit; }
      .quiet { color: var(--ink-dim); }
    `,
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
  };
}
