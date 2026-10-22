# farstone.561.group

A playable harbor MUD — and the clean field for a way of serving the web that is weirdly ancient and super modern at once: **transport the stuff that pipes out of our package scripts.**

## The idea

A script in one of our packages is a filter: params in, a representation out.
That is the ancient shape — CGI, `inetd`, the Unix pipe — where the *program is the endpoint*.
The site does not re-implement the world; it runs the script and ships whatever pipes out.

The modern half is the transport.
`@emsenn/web`'s `send()` does not buffer a script's output into an "API response object" — it pipes a byte stream (`AsyncIterable<Uint8Array>`) straight to the HTTP response, chunk by chunk.
So a script's stdout becomes an HTTP body with no materialization: streaming all the way down, content-negotiated, cacheable.

The world logic lives in the packages — `@emsenn/fizzos`, and beneath it computing / games / relationality.
Adding to farstone is adding a script and a row to the route table, never plumbing a new response object through the server.

## Shape

- `src/transport.ts` — the whole transport.
  `Script = params -> pipe of bytes`; `pipe(command, args)` runs a child process and yields its stdout (the literal pipe); `transportApp(routes)` turns a table of scripts into an `@emsenn/web` App that streams each one.
- `scripts/*.mjs` — the world scripts.
  `look.mjs` composes a room as a FizzOS thing (settled to a real bilattice charge) and prints it; the site transports that.
- `src/index.ts` — `farstoneApp()`: a landing page merged with the transported routes.
- `src/server.ts` — start it on `@emsenn/web` with graceful shutdown.

## Run

```sh
pnpm --filter @emsenn/farstone.561.group serve   # http://127.0.0.1:18793/
```

`GET /look` runs `scripts/look.mjs` and streams the harbor; `GET /look?room=harbor` threads the request param onto the script's argv.
