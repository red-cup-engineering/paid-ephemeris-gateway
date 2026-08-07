// variables.mts — the ESI variable substitution language.
//
// $(NAME), $(NAME{key}) dictionary indexing, $(NAME|fallback) defaults,
// and $$ escaping. The variable NAMES the W3C spec defines (HTTP_HOST,
// HTTP_COOKIE, …) are representation-level, but their VALUES are read
// off a request — that binding belongs to whoever holds the request,
// not here. Substitution takes the bindings it is given.

function indexValue(value: unknown, key: string): unknown {
  if (value && typeof value === "object") return (value as Record<string, unknown>)[key];
  for (const pair of String(value ?? "").split(/[;&]/)) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq).trim() === key) return decodeURIComponent(pair.slice(eq + 1).trim());
  }
  return undefined;
}

export function substituteVars(text: unknown, vars: Record<string, unknown> = {}): string {
  let out = String(text ?? "");
  if (!out.includes("$")) return out;
  const sentinel = "\0ESI_DOLLAR\0";
  out = out.replace(/\$\$/g, sentinel);
  out = out.replace(/\$\(([A-Za-z0-9_]+)(?:\{([^}]*)\})?(?:\|([^)]*))?\)/g, (_all, name: string, key: string | undefined, fallback: string | undefined) => {
    let value = vars[name];
    if (key !== undefined) value = indexValue(value, key);
    if (value == null || value === "") return fallback ?? "";
    return String(value);
  });
  return out.split(sentinel).join("$");
}
