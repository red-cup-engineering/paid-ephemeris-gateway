// accept-language.mts — the Accept-Language representation and the
// language choice (RFC 4647 basic filtering).

export type AcceptLanguageEntry = { range: string; q: number; specificity: number; order: number };

function languageSpecificity(range: string): number {
  if (range === "*") return 0;
  return range.split("-").filter(Boolean).length;
}

export function parseAcceptLanguage(header: string): AcceptLanguageEntry[] {
  return header
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, order) => {
      const [range = "*", ...params] = s.split(";").map((p) => p.trim());
      const qParam = params.find((p) => p.startsWith("q="));
      const q = qParam ? parseFloat(qParam.slice(2)) : 1;
      const normalized = range.toLowerCase();
      return {
        range: normalized || "*",
        q: isNaN(q) ? 1 : q,
        specificity: languageSpecificity(normalized || "*"),
        order,
      };
    })
    .sort((a, b) => b.q - a.q || b.specificity - a.specificity || a.order - b.order);
}

function matchesLanguage(entry: AcceptLanguageEntry, offered: string): boolean {
  if (entry.range === "*") return true;
  const tag = offered.toLowerCase();
  return tag === entry.range || tag.startsWith(`${entry.range}-`);
}

function languagePreference(entries: readonly AcceptLanguageEntry[], offered: string): AcceptLanguageEntry | null {
  const matches = entries
    .filter((entry) => matchesLanguage(entry, offered))
    .sort((a, b) => b.specificity - a.specificity || a.order - b.order);
  return matches[0] ?? null;
}

/** Negotiate a language tag using RFC 4647-style basic filtering.
 *  Returns the original offered tag, or null if every matching range has q=0. */
export function negotiateLanguage(acceptLanguageHeader: string | undefined, offered: readonly string[]): string | null {
  if (!offered.length) return null;
  if (!acceptLanguageHeader) return offered[0] ?? null;
  const entries = parseAcceptLanguage(acceptLanguageHeader);
  const candidates: Array<{ language: string; q: number; specificity: number; order: number }> = [];
  for (const [order, language] of offered.entries()) {
    const preference = languagePreference(entries, language);
    if (!preference || preference.q <= 0) continue;
    candidates.push({ language, q: preference.q, specificity: preference.specificity, order });
  }
  candidates.sort((a, b) => b.q - a.q || b.specificity - a.specificity || a.order - b.order);
  return candidates[0]?.language ?? null;
}
