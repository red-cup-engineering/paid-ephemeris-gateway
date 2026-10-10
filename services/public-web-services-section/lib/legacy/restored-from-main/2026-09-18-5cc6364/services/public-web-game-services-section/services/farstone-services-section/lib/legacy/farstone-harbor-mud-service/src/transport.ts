/**
 * Pipe-transport: serve the web by transporting what pipes out of our scripts.
 *
 * Weirdly ancient: a script is a filter — argv/params in, a representation out on
 * stdout. That is CGI, inetd, the Unix pipe. The program IS the endpoint.
 *
 * Super modern: the web layer (`@emsenn/web`) does not buffer that output into an
 * "API response object"; its `send()` pipes a byte stream — `AsyncIterable<Uint8Array>`
 * — straight to the HTTP response, chunk by chunk. So a script's pipe becomes an
 * HTTP body with no materialization: streaming all the way down.
 *
 * This module is the whole transport. A `Script` is `params -> pipe of bytes`;
 * `transportApp` turns a table of named scripts into an `@emsenn/web` `App` where
 * each route streams its script's output. `pipe` runs an actual child process and
 * yields its stdout — the literal "stuff that pipes out". A `Script` can equally be
 * an in-process async generator; both are just byte streams to the transport.
 *
 * The world logic lives in the packages (`@red-cup-engineering/fizzos`, and below it
 * computing/games/relationality). The site is only transport.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { App, Context, Repr, Resource } from "@red-cup-engineering/http-server";

/** What a script pipes out: a byte stream (the pipe) or a ready string. */
export type Piped = AsyncIterable<Uint8Array> | string;

/** A transportable script: request params (the argv) in, a pipe of representation bytes out. */
export type Script = (params: Readonly<Record<string, string>>) => Piped | Promise<Piped>;

/** One transported route: a path, the script behind it, and the media type it emits. */
export interface TransportRoute {
  readonly path: string;
  readonly script: Script;
  /** The media type the script's pipe carries (default `application/json`). */
  readonly type?: string;
  readonly methods?: readonly string[];
}

/**
 * Run a child process and yield its stdout as a byte stream — the literal pipe.
 * `command` + `args` in, stdout out; stderr is inherited so script errors surface
 * in the server log. The child is killed if the stream is abandoned.
 */
export function pipe(command: string, args: readonly string[] = []): AsyncIterable<Uint8Array> {
  return (async function* piped() {
    const child = spawn(command, [...args], { stdio: ["ignore", "pipe", "inherit"] });
    try {
      for await (const chunk of child.stdout) yield chunk as Uint8Array;
    } finally {
      if (child.exitCode === null) child.kill();
    }
  })();
}

/** A `Script` that pipes a node program file, threading chosen request params onto its argv. */
export function pipeNode(scriptUrl: URL, argvOf: (params: Readonly<Record<string, string>>) => readonly string[] = () => []): Script {
  const file = fileURLToPath(scriptUrl);
  return (params) => pipe("node", [file, ...argvOf(params)]);
}

/** Turn a table of transported routes into an `@emsenn/web` App that streams each script's pipe. */
export function transportApp(routes: readonly TransportRoute[]): App {
  const resources: Resource[] = routes.map((route) => ({
    match: route.path,
    methods: route.methods ?? ["GET"],
    produces: [route.type ?? "application/json"],
    handler: async (ctx: Context): Promise<Repr> => {
      const params = Object.fromEntries(ctx.url.searchParams.entries());
      const body = await route.script(params);
      return { status: 200, type: route.type ?? "application/json", body };
    },
  }));
  return { resources };
}

/** Consume a pipe to a string — for tests and for callers that want the whole representation. */
export async function collect(body: Piped): Promise<string> {
  if (typeof body === "string") return body;
  const decoder = new TextDecoder();
  let out = "";
  for await (const chunk of body) out += decoder.decode(chunk, { stream: true });
  return out + decoder.decode();
}
