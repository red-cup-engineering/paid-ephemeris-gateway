// The cable: more than one newswire, brought together coherently.
//
// Vocabulary, in the literal electrical sense: a cable is a bundle of
// individually insulated wires sharing a common sheath. Each wire (a
// provenanced claim stream with a masthead) keeps its identity — its
// insulation is its namespace in URL space — while the sheath is the
// shared process, port, discovery surface, and audit. The routing is one
// of the two projections of the product (cable × wire) into URL space:
// by subdomain (`https://<wire>.<domain>/`) or by subfolder
// (`https://<domain>/<wire>/`).
//
// Laws: wire names are lowercase atoms, so both projections are injective
// and prefix-free; every canonical URL a wire publishes derives from its
// projected base and nothing else. TypeError is the only throw.

/**
 * The two routing projections of a cable into URL space: "subdomain" places
 * each wire at `https://<wire>.<domain>/`, "subfolder" at
 * `https://<domain>/<wire>/`.
 */
export type CableRouting = "subdomain" | "subfolder";

/**
 * One wire in a cable: a provenanced claim stream identified by a
 * lowercase-atom name, carrying its masthead (title, description, optional
 * author and beat keyword) and the store where its claim-state bundles live.
 */
export type WireBinding = Readonly<{
  /** The wire's name: lowercase atoms joined by hyphens; the URL atom. */
  name: string;
  title: string;
  description: string;
  /** The masthead author for the wire's surfaces. */
  author?: string | Readonly<{ name: string; url?: string }>;
  /** Where the wire's claim-state bundles live (a directory path or URL). */
  store: string;
  /** The wire's beat keyword, when one applies. */
  keyword?: string;
}>;

/**
 * A cable: a bundle of wires sharing one apex domain and routing scheme, with
 * an optional path prefix for subfolder routing. Models the sheath that
 * projects each of its wires into URL space.
 */
export type NewsCable = Readonly<{
  /** The cable's name. */
  name: string;
  /** The apex domain the routing projects under (no scheme, no slash). */
  domain: string;
  routing: CableRouting;
  /**
   * For subfolder routing only: a single path segment inserted before the
   * wire name. Absent means no prefix. Example: "newswires" yields
   * `https://domain/newswires/<wire>/`.
   */
  routingPrefix?: string;
  wires: readonly WireBinding[];
}>;

const WIRE_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DOMAIN_PATTERN = /^[a-z0-9]+([.-][a-z0-9]+)*$/;

const ROUTING_PREFIX_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Asserts that an unknown value is a well-formed NewsCable: checks name, bare
 * domain, routing scheme, prefix validity, and a non-empty list of wires with
 * unique lowercase-atom names and non-empty title/description/store. Throws
 * TypeError on any violation.
 */
export function assertNewsCable(value: unknown): asserts value is NewsCable {
  if (value === null || typeof value !== "object") throw new TypeError("cable must be an object");
  const cable = value as Record<string, unknown>;
  if (typeof cable.name !== "string" || cable.name.length === 0) {
    throw new TypeError("cable.name must be a non-empty string");
  }
  if (typeof cable.domain !== "string" || !DOMAIN_PATTERN.test(cable.domain)) {
    throw new TypeError(`cable.domain must be a bare domain (got ${String(cable.domain)})`);
  }
  if (cable.routing !== "subdomain" && cable.routing !== "subfolder") {
    throw new TypeError('cable.routing must be "subdomain" or "subfolder"');
  }
  if (cable.routingPrefix !== undefined) {
    if (cable.routing !== "subfolder") {
      throw new TypeError("cable.routingPrefix is only valid with subfolder routing");
    }
    if (typeof cable.routingPrefix !== "string" || !ROUTING_PREFIX_PATTERN.test(cable.routingPrefix)) {
      throw new TypeError(`cable.routingPrefix must be a lowercase atom (got ${String(cable.routingPrefix)})`);
    }
  }
  if (!Array.isArray(cable.wires) || cable.wires.length === 0) {
    throw new TypeError("cable.wires must be a non-empty list");
  }
  const seen = new Set<string>();
  for (const wire of cable.wires as readonly Record<string, unknown>[]) {
    if (typeof wire?.name !== "string" || !WIRE_NAME_PATTERN.test(wire.name)) {
      throw new TypeError(`wire name must be lowercase atoms (got ${String(wire?.name)})`);
    }
    if (seen.has(wire.name)) throw new TypeError(`duplicate wire name: ${wire.name}`);
    seen.add(wire.name);
    for (const key of ["title", "description", "store"]) {
      if (typeof wire[key] !== "string" || (wire[key] as string).length === 0) {
        throw new TypeError(`wire ${wire.name}: ${key} must be a non-empty string`);
      }
    }
  }
}

/** The routing projection: a wire's canonical base URL under its cable. */
export function wireBaseUrl(cable: Pick<NewsCable, "domain" | "routing" | "routingPrefix">, wireName: string): string {
  if (!WIRE_NAME_PATTERN.test(wireName)) {
    throw new TypeError(`wire name must be lowercase atoms (got ${wireName})`);
  }
  if (cable.routing === "subdomain") return `https://${wireName}.${cable.domain}/`;
  const prefix = cable.routingPrefix ? `${cable.routingPrefix}/` : "";
  return `https://${cable.domain}/${prefix}${wireName}/`;
}

/** The sheath's own base URL: the cable index and /cable.json live here. */
export function cableBaseUrl(cable: Pick<NewsCable, "domain">): string {
  return `https://${cable.domain}/`;
}

/**
 * Invert the projection: which wire (if any) a request belongs to, from
 * its Host header and path. Returns the wire name and the path within the
 * wire's namespace, or a "sheath" reading for the cable's own surfaces.
 */
export function routeRequest(
  cable: NewsCable,
  host: string,
  path: string,
): Readonly<{ kind: "wire"; name: string; subPath: string }> | Readonly<{ kind: "sheath"; subPath: string }> {
  const bareHost = host.split(":")[0]?.toLowerCase() ?? "";
  if (cable.routing === "subdomain") {
    if (bareHost.endsWith(`.${cable.domain}`)) {
      const label = bareHost.slice(0, bareHost.length - cable.domain.length - 1);
      if (cable.wires.some((wire) => wire.name === label)) {
        return Object.freeze({ kind: "wire" as const, name: label, subPath: path });
      }
    }
    return Object.freeze({ kind: "sheath" as const, subPath: path });
  }
  const [, first, ...rest] = path.split("/");
  if (cable.routingPrefix) {
    if (first !== cable.routingPrefix) return Object.freeze({ kind: "sheath" as const, subPath: path });
    const [wireName, ...wireRest] = rest;
    if (wireName !== undefined && cable.wires.some((wire) => wire.name === wireName)) {
      return Object.freeze({ kind: "wire" as const, name: wireName, subPath: `/${wireRest.join("/")}` });
    }
    return Object.freeze({ kind: "sheath" as const, subPath: path });
  }
  if (first !== undefined && cable.wires.some((wire) => wire.name === first)) {
    return Object.freeze({ kind: "wire" as const, name: first, subPath: `/${rest.join("/")}` });
  }
  return Object.freeze({ kind: "sheath" as const, subPath: path });
}
