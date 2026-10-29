/**
 * farstone.561.group — the playable harbor, served by transport.
 *
 * `farstoneApp` is a landing page plus a table of transported routes. Each route's
 * handler runs a package script and streams whatever pipes out of it. The world is
 * not modelled here; it lives in the scripts (and in @red-cup-engineering/fizzos beneath them).
 * Adding to the world is adding a script and a row to the table — never plumbing a
 * new response object through the server.
 */
import type { App } from "@red-cup-engineering/http-server";
import { htmlRepr, mergeApps } from "@red-cup-engineering/http-server";
import { pipeNode, transportApp } from "./transport.ts";

const scriptsDir = new URL("../scripts/", import.meta.url);

const LANDING = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>farstone</title></head>
<body>
<h1>farstone</h1>
<p>a harbor, served by transporting what pipes out of our scripts.</p>
<ul>
  <li><a href="/play?do=look">/play?do=look</a> — play the harbor; semicolon-separate commands, e.g.
    <a href="/play?do=look;west;take%20rope;inventory">/play?do=look;west;take rope;inventory</a>
    (pipes <code>scripts/play.mjs</code> through a fresh game)</li>
  <li><a href="/look">/look</a> — one room as JSON (pipes <code>scripts/look.mjs</code>, a FizzOS world)</li>
  <li><a href="/look?room=the-boatyard">/look?room=the-boatyard</a> — look at a named room</li>
</ul>
</body>
</html>
`;

const landing: App = {
  resources: [
    { match: "/", methods: ["GET"], produces: ["text/html"], handler: () => htmlRepr(LANDING) },
  ],
};

/** The farstone App: the landing page merged with the transported world scripts. */
export function farstoneApp(): App {
  return mergeApps(
    landing,
    transportApp([
      {
        path: "/look",
        type: "application/json",
        script: pipeNode(new URL("look.mjs", scriptsDir), (params) => (params.room ? [params.room] : [])),
      },
      {
        // /play?do=look;west;take rope — each ;-separated command is one turn of a
        // fresh game; the script pipes the transcript, the web layer streams it.
        path: "/play",
        type: "text/plain",
        script: pipeNode(new URL("play.mjs", scriptsDir), (params) =>
          (params.do ?? "look").split(";").map((c) => c.trim()).filter(Boolean),
        ),
      },
    ]),
  );
}
