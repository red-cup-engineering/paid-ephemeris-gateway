// cable-app.mts — Koios.News's own collapse newscable.
//
// The cable carrier lives upstream in @emsenn/content-production/cable: a
// newscable is the bundle of declared newswires, and each wire owns its store.
// Koios supplies only the publication shell: config path, theme render, and web
// App transport. The farm reads this cable as witnessed intake.

import { Buffer } from "node:buffer";

import {
  aggregateWires,
  createNewscable,
  readNewscableSiteConfig,
  type Newscable,
  type RenderDocument,
} from "@emsenn/content-production/cable";
import type { App } from "@emsenn/http-server";
import { render } from "@emsenn/computing-with-the-web/theming";

import { DEFAULT_CONTENT_PRODUCTION_CONFIG } from "./config.mjs";
import { koiosTheme } from "./theme.mjs";

const renderDocument: RenderDocument = (title, content, options) =>
  render(koiosTheme, content, {
    title,
    ...(options.description === undefined ? {} : { description: options.description }),
    ...(options.canonical === undefined ? {} : { canonical: options.canonical }),
    ...(options.siteName === undefined ? {} : { siteName: options.siteName }),
    ...(options.links === undefined ? {} : { links: options.links }),
  });

export async function createKoiosNewscable(
  configPath = DEFAULT_CONTENT_PRODUCTION_CONFIG,
  onSkip: (message: string) => void = () => {},
): Promise<Newscable> {
  const config = await readNewscableSiteConfig(configPath);
  const wires = aggregateWires(configPath, config, onSkip, renderDocument);
  return createNewscable({
    name: config.name,
    title: config.title,
    description: config.description,
    domain: config.domain,
    routing: config.routing,
    ...(config.routingPrefix === undefined ? {} : { routingPrefix: config.routingPrefix }),
    wires,
    render: renderDocument,
  });
}

export async function createKoiosNewscableApp(
  configPath = DEFAULT_CONTENT_PRODUCTION_CONFIG,
  onSkip: (message: string) => void = () => {},
): Promise<App> {
  return createNewscableApp(await createKoiosNewscable(configPath, onSkip));
}

export function createNewscableApp(cable: Newscable): App {
  return {
    resources: [
      {
        id: "koios.cable",
        name: "Koios Collapse Newscable",
        route: "/*",
        match: () => ({}),
        methods: ["GET", "HEAD"],
        handler: async (ctx) => {
          const host = ctx.req.headers.host ?? cable.domain;
          const surface = await cable.handle(host, ctx.url.pathname);
          ctx.res.writeHead(surface.status, {
            ...surface.headers,
            "content-length": String(Buffer.byteLength(surface.body)),
          });
          ctx.res.end((ctx.req.method ?? "GET") === "HEAD" ? undefined : surface.body);
        },
      },
    ],
  };
}
