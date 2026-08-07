// platform/fetch-adapter.ts — WHATWG Fetch <-> Node.js HTTP adapters.

import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import type { App, Context, Middleware } from "../types.mjs";
import { handler } from "../pipeline.mjs";
import {
  bodyForbidden,
  pipeCompressed,
  planWebResponseCompression,
  writeContentCodingNotAcceptable,
  type WebResponseCompressionOptions,
} from "../internal/web-response-compression.mjs";
import {
  applyTrailerHeader,
  immediateResponseTrailers,
  resolveResponseTrailers,
  writeResponseTrailers,
} from "../internal/trailers.mjs";

export type WebFetchHandler = (request: Request) => Promise<Response>;
export type FetchHandler = (request: Request, ctx: Context) => Response | null | undefined | Promise<Response | null | undefined>;
export type FromFetchOptions = {
  passThrough?: boolean;
  onError?: (error: unknown, req: IncomingMessage) => void;
};
export type FetchMiddleware = {
  (ctx: Context): Promise<boolean>;
  (req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<boolean>;
};

function requestHasBody(method: string | undefined): boolean {
  const normalized = (method ?? "GET").toUpperCase();
  return normalized !== "GET" && normalized !== "HEAD";
}

function absoluteUrl(req: IncomingMessage, ctx: Partial<Context> & { base?: string } = {}): string {
  if (ctx.url instanceof URL) return ctx.url.href;
  const host = req.headers.host ?? "localhost";
  const proto = String(req.headers["x-forwarded-proto"] ?? "http").split(",")[0]?.trim() || "http";
  const base = ctx.base ?? `${proto}://${host}/`;
  return new URL(req.url ?? "/", base).href;
}

function headersFrom(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers ?? {})) {
    if (name.startsWith(":")) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.append(name, value);
    }
  }
  return headers;
}

export function toWebRequest(req: IncomingMessage, ctx: Partial<Context> & { base?: string } = {}): Request {
  const method = (req.method ?? "GET").toUpperCase();
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers: headersFrom(req),
    ...(ctx.signal ? { signal: ctx.signal } : {}),
  };
  if (requestHasBody(method)) {
    init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
    init.duplex = "half";
  }
  return new Request(absoluteUrl(req, ctx), init);
}

type SendOptions = { method?: string } & WebResponseCompressionOptions;

function setResponseHeaders(res: ServerResponse, headers: Headers): void {
  for (const [name, value] of headers) {
    if (name.toLowerCase() === "set-cookie") continue;
    try {
      res.setHeader(name, value);
    } catch {}
  }

  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const cookies = typeof getSetCookie === "function" ? getSetCookie.call(headers) : [];
  if (cookies.length) {
    try {
      res.setHeader("set-cookie", cookies);
    } catch {}
  }
}

export function sendWebResponse(res: ServerResponse, response: Response, options?: SendOptions): Promise<void>;
export function sendWebResponse(response: Response, res: ServerResponse, options?: SendOptions): Promise<void>;
export function sendWebResponse(
  first: ServerResponse | Response,
  second: Response | ServerResponse,
  options: SendOptions = {},
): Promise<void> {
  const responseFirst = first instanceof Response;
  const response = responseFirst ? first : second as Response;
  const res = responseFirst ? second as ServerResponse : first as ServerResponse;

  return new Promise((resolve) => {
    const status = response.status ?? 200;
    setResponseHeaders(res, response.headers ?? new Headers());

    const isHead = (options.method ?? "").toUpperCase() === "HEAD";
    const body = response.body;
    const headers: Record<string, string> = {};
    for (const [name, value] of response.headers ?? new Headers()) headers[name] = value;
    const immediateTrailers = immediateResponseTrailers(response);
    applyTrailerHeader(headers, immediateTrailers);
    const plan = planWebResponseCompression(status, headers, options);
    if (plan.kind === "not-acceptable") {
      writeContentCodingNotAcceptable(headers);
    }
    if (!Object.keys(headers).some((name) => name.toLowerCase() === "content-length")) {
      try {
        res.removeHeader("content-length");
      } catch {}
    }
    for (const [name, value] of Object.entries(headers)) {
      if (name.toLowerCase() === "set-cookie") continue;
      try {
        res.setHeader(name, value);
      } catch {}
    }

    if (plan.kind === "not-acceptable") {
      try {
        res.writeHead(406);
      } catch {}
      res.end(isHead ? undefined : "Not Acceptable");
      resolve();
      return;
    }

    if (!body || isHead || bodyForbidden(status)) {
      try {
        res.writeHead(status, response.statusText || undefined);
      } catch {
        try {
          res.writeHead(status);
        } catch {}
      }
      res.end();
      resolve();
      return;
    }

    try {
      res.writeHead(status, response.statusText || undefined);
    } catch {
      try {
        res.writeHead(status);
      } catch {}
    }

    const nodeStream = pipeCompressed(Readable.fromWeb(body as NodeReadableStream<Uint8Array>), plan);
    const finish = () => resolve();
    const fail = () => {
      try {
        res.destroy();
      } catch {}
      resolve();
    };
    nodeStream.on("error", fail);
    nodeStream.on("end", () => {
      void resolveResponseTrailers(response).then((trailers) => {
        writeResponseTrailers(res, trailers);
        res.end();
      }).catch(fail);
    });
    res.on("error", () => {
      try {
        nodeStream.destroy();
      } catch {}
      resolve();
    });
    res.on("close", () => {
      if (!res.writableFinished) {
        try {
          nodeStream.destroy();
        } catch {}
      }
    });
    res.on("finish", finish);
    nodeStream.pipe(res, { end: false });
  });
}

function fetchMiddleware(fetchHandler: FetchHandler, options: FromFetchOptions = {}): FetchMiddleware {
  const { passThrough = false, onError } = options;
  return (async (...args: [Context] | [IncomingMessage, ServerResponse, Context]) => {
    const ctx = args.length === 1 ? args[0] : args[2];
    const req = args.length === 1 ? ctx.req : args[0];
    const res = args.length === 1 ? ctx.res : args[1];
    let response: Response | null | undefined;

    try {
      response = await fetchHandler(toWebRequest(req, ctx), ctx);
    } catch (error) {
      try {
        onError?.(error, req);
      } catch {}
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end("Internal Server Error");
      } else {
        try {
          res.end();
        } catch {}
      }
      return true;
    }

    if (response == null) {
      if (passThrough) return false;
      if (!res.headersSent) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not Found");
      }
      return true;
    }

    if (!(response instanceof Response)) {
      try {
        onError?.(new TypeError("fetch handler must return a Response"), req);
      } catch {}
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end("Internal Server Error");
      } else {
        try {
          res.end();
        } catch {}
      }
      return true;
    }

    const sendOptions: SendOptions = {
      ...(req.method === undefined ? {} : { method: req.method }),
      ...(req.headers["accept-encoding"] === undefined ? {} : { acceptEncoding: req.headers["accept-encoding"] }),
      ...(req.headers.range === undefined ? {} : { range: req.headers.range }),
    };
    await sendWebResponse(res, response, sendOptions);
    return true;
  }) as FetchMiddleware;
}

function appToFetch(app: App): WebFetchHandler {
  const h = handler(app);
  return async (request: Request): Promise<Response> => {
    const chunks: Buffer[] = [];
    const status = { code: 200, message: "OK" };
    const responseHeaders = new Headers();
    let resolveResponse: (response: Response) => void = () => {};
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });

    const nodeReq = Object.assign(
      request.body ? Readable.fromWeb(request.body as NodeReadableStream<Uint8Array>) : Readable.from([]),
      {
        method: request.method,
        url: `${new URL(request.url).pathname}${new URL(request.url).search}`,
        headers: {} as Record<string, string>,
        httpVersion: "1.1",
        socket: { remoteAddress: "127.0.0.1" },
        webAbortSignal: request.signal,
      },
    ) as unknown as IncomingMessage;
    request.headers.forEach((value, key) => {
      (nodeReq as IncomingMessage & { headers: Record<string, string> }).headers[key] = value;
    });

    const nodeRes = {
      statusCode: 200,
      statusMessage: "OK",
      headersSent: false,
      writableEnded: false,
      setHeader(name: string, value: string | number | string[]) {
        if (Array.isArray(value)) {
          responseHeaders.delete(name);
          for (const item of value) responseHeaders.append(name, item);
        } else {
          responseHeaders.set(name, String(value));
        }
      },
      getHeader(name: string) {
        return responseHeaders.get(name) ?? undefined;
      },
      hasHeader(name: string) {
        return responseHeaders.has(name);
      },
      removeHeader(name: string) {
        responseHeaders.delete(name);
      },
      writeHead(this: { headersSent: boolean }, code: number, messageOrHeaders?: string | Record<string, string>, maybeHeaders?: Record<string, string>) {
        status.code = code;
        if (typeof messageOrHeaders === "string") status.message = messageOrHeaders;
        const headers = typeof messageOrHeaders === "object" ? messageOrHeaders : maybeHeaders;
        for (const [name, value] of Object.entries(headers ?? {})) responseHeaders.set(name, String(value));
        this.headersSent = true;
        return this;
      },
      write(chunk: Buffer | string | Uint8Array) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      },
      end(this: { writableEnded: boolean }, chunk?: Buffer | string | Uint8Array) {
        if (chunk !== undefined) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        this.writableEnded = true;
        resolveResponse(new Response(Buffer.concat(chunks), {
          status: status.code,
          statusText: status.message,
          headers: responseHeaders,
        }));
        return this;
      },
      on() { return this; },
      once() { return this; },
    } as unknown as ServerResponse;

    h(nodeReq, nodeRes);
    return responsePromise;
  };
}

export function fromFetch(app: App): WebFetchHandler;
export function fromFetch(fetchHandler: FetchHandler, options?: FromFetchOptions): Middleware & FetchMiddleware;
export function fromFetch(input: App | FetchHandler, options: FromFetchOptions = {}): WebFetchHandler | (Middleware & FetchMiddleware) {
  if (typeof input === "function") return fetchMiddleware(input, options) as Middleware & FetchMiddleware;
  return appToFetch(input);
}
