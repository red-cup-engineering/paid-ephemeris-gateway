// accept.mts — the Accept header representation and the media-type choice.
//
// parseAccept decodes the header text into ranked entries; negotiateType
// chooses among offered media types. Negotiation is codec selection: the
// chosen representation determines which codec a traversal uses.

export type AcceptEntry = { type: string; subtype: string; q: number; specificity: number; order: number };

function mediaTypeParts(value: string): [string, string] {
  const [mediaType = "*/*"] = value.split(";", 1);
  const [type = "*", subtype = "*"] = mediaType.trim().toLowerCase().split("/");
  return [type, subtype];
}

export function parseAccept(header: string): AcceptEntry[] {
  return header
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, order) => {
      const [mediaRange, ...params] = s.split(";").map((p) => p.trim());
      const qParam = params.find((p) => p.startsWith("q="));
      const q = qParam ? parseFloat(qParam.slice(2)) : 1;
      const [type, subtype] = mediaTypeParts(mediaRange ?? "*/*");
      const specificity = type === "*" ? 0 : subtype === "*" ? 1 : 2;
      return { type, subtype, q: isNaN(q) ? 1 : q, specificity, order };
    })
    .sort((a, b) => b.q - a.q || b.specificity - a.specificity || a.order - b.order);
}

function acceptsType(entry: AcceptEntry, candidate: string): boolean {
  const [t, s] = mediaTypeParts(candidate);
  if (entry.type === "*") return true;
  if (entry.type !== t) return false;
  return entry.subtype === "*" || entry.subtype === s;
}

function mediaPreference(entries: readonly AcceptEntry[], offered: string): AcceptEntry | null {
  const matches = entries
    .filter((entry) => acceptsType(entry, offered))
    .sort((a, b) => b.specificity - a.specificity || b.q - a.q || a.order - b.order);
  return matches[0] ?? null;
}

/** Negotiate content type. Returns the best matching offered type, or null if none is acceptable. */
export function negotiateType(acceptHeader: string | undefined, offered: readonly string[]): string | null {
  if (!offered.length) return null;
  if (!acceptHeader) return offered[0] ?? null;

  const accepted = parseAccept(acceptHeader);
  const candidates: Array<{ type: string; q: number; specificity: number; order: number }> = [];
  for (const [order, type] of offered.entries()) {
    const preference = mediaPreference(accepted, type);
    if (!preference || preference.q <= 0) continue;
    candidates.push({ type, q: preference.q, specificity: preference.specificity, order });
  }
  candidates.sort((a, b) => b.q - a.q || b.specificity - a.specificity || a.order - b.order);
  return candidates[0]?.type ?? null;
}
