import type { CorsOptions, Middleware } from "../types.mjs";
import { applyCors, corsPreflight } from "../http.mjs";

export type CorsMiddlewareOptions = CorsOptions & {
  preflight?: boolean;
  optionsSuccessStatus?: number;
};

export function cors(options: CorsMiddlewareOptions = {}): Middleware {
  const {
    preflight = true,
    optionsSuccessStatus = 204,
    ...corsOptions
  } = options;
  return (ctx) => {
    if (preflight && ctx.req.method === "OPTIONS" && ctx.req.headers["access-control-request-method"]) {
      corsPreflight(ctx.req, ctx.res, corsOptions, optionsSuccessStatus);
      return true;
    }
    applyCors(ctx.res, ctx.req, corsOptions);
  };
}
