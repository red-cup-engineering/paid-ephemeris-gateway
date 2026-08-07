import type { Middleware, SecurityHeaders } from "../types.mjs";
import { applySecurityHeaders } from "../http.mjs";

export type SecurityHeadersMiddlewareOptions = SecurityHeaders | true;

export function securityHeaders(policy: SecurityHeadersMiddlewareOptions = true): Middleware {
  return (ctx) => {
    applySecurityHeaders(ctx.res, policy);
  };
}

export const helmet = securityHeaders;
