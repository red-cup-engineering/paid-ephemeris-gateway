// link.mts — the Link field (RFC 8288).
//
// Semantic value: a list of link-values (target plus parameters). Wire
// form: the field text. The pair is a RETRACTION: parseLinkHeader
// lowercases parameter names, forgets quoting style, and keeps one
// value per parameter name, so parseLinkHeader ∘ linkHeader = id on
// parsed values.

export type LinkValue = Readonly<{
  href: string;
  params: Readonly<Record<string, string>>;
}>;

export function linkHeader(links: Array<{ href: string; rel: string; [k: string]: string }>): string {
  return links.map(({ href, ...attrs }) => {
    const params = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join("; ");
    return `<${href}>; ${params}`;
  }).join(", ");
}

export function parseLinkHeader(value: string | null | undefined): readonly LinkValue[] {
  if (!value) return Object.freeze([]);
  const links: LinkValue[] = [];
  for (const part of value.split(/,(?=\s*<)/)) {
    const match = /^\s*<([^>]*)>\s*(.*)$/.exec(part);
    if (!match) continue;
    const params: Record<string, string> = {};
    const paramRe = /;\s*([a-zA-Z0-9*_-]+)\s*=\s*("[^"]*"|[^;,\s]+)/g;
    let param: RegExpExecArray | null;
    while ((param = paramRe.exec(match[2] ?? "")) !== null) {
      let text = param[2]!;
      if (text.startsWith("\"") && text.endsWith("\"")) text = text.slice(1, -1);
      params[param[1]!.toLowerCase()] = text;
    }
    links.push(Object.freeze({ href: match[1]!.trim(), params: Object.freeze(params) }));
  }
  return Object.freeze(links);
}
