// edge/ipfilter.ts — IPv4/IPv6 CIDR allow/deny middleware.
//
// Rules are stored as Memes; local CIDR evidence settles whether the client IP is admitted:
//   potential = allowed (admit)
//   active    = denied (403)
//   stable    = contradicted (in both allow and deny list — held as 403)

import { witness, UtteranceLog } from "../internal/witness.mjs";
import { inCidr } from "../internal/net.mjs";
import { chargeValueFromBits } from "../admission.mjs";
import type { Middleware, Context } from "../types.mjs";
import type { IncomingMessage } from "node:http";

export type IpFilterOptions = {
  /** CIDR ranges to explicitly allow. If set, all others are denied unless in deny list. */
  allow?: string[];
  /** CIDR ranges to deny. Applied after allow. */
  deny?: string[];
  /** Trust X-Forwarded-For header (default true). */
  trustProxy?: boolean;
  onDeny?: (ctx: Context, ip: string) => void | Promise<void>;
  statusCode?: number;   // default 403
  message?: string;
};

function clientIp(req: IncomingMessage, trustProxy: boolean): string {
  if (trustProxy) {
    const fwd = req.headers["x-forwarded-for"];
    if (fwd) return String(fwd).split(",")[0]!.trim();
  }
  return req.socket?.remoteAddress ?? "127.0.0.1";
}

export function ipFilter(opts: IpFilterOptions): Middleware {
  const store = new UtteranceLog();
  const trust = opts.trustProxy !== false;
  const status = opts.statusCode ?? 403;
  const message = opts.message ?? "Forbidden";

  const allowCidrs = opts.allow ?? [];
  const denyCidrs = opts.deny ?? [];

  for (const cidr of allowCidrs) {
    witness(store, { subject: cidr, predicate: "ip-rule", object: "allow" }, [true, false]);
  }
  for (const cidr of denyCidrs) {
    witness(store, { subject: cidr, predicate: "ip-rule", object: "deny" }, [false, true]);
  }

  return async (ctx) => {
    const ip = clientIp(ctx.req, trust);

    const denied = denyCidrs.some((cidr) => inCidr(ip, cidr));
    const allowed = allowCidrs.length > 0
      ? allowCidrs.some((cidr) => inCidr(ip, cidr))
      : !denied;
    const memeCharge = chargeValueFromBits(allowed, denied || !allowed);

    if (memeCharge === "potential") return;

    await opts.onDeny?.(ctx, ip);
    ctx.res.writeHead(status).end(message);
    return true;
  };
}

/** Allow only requests from localhost (127.x, ::1). */
export function localhostOnly(): Middleware {
  return ipFilter({ allow: ["127.0.0.0/8", "::1/128"], trustProxy: false });
}

/** Deny requests from a list of known bad CIDRs. */
export function denyList(cidrs: string[]): Middleware {
  return ipFilter({ deny: cidrs });
}
