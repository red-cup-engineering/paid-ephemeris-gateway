/**
 * Hand-rolled frontmatter parser — zero dependencies, per house constraints. Deliberately a
 * subset of YAML (DESIGN.md §7): scalars and flat string lists only. Nested maps (this corpus's
 * `references:` citation block is the running example) are recognized and skipped, never
 * mis-parsed — v1 has no use for them (`cites` is a flat list and is all §1 needs).
 */
import type { FrontmatterData } from './types.mts';

export interface ParsedMarkdown {
  data: FrontmatterData;
  body: string;
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    const first = t[0];
    const last = t[t.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return t.slice(1, -1);
    }
  }
  return t;
}

const TOP_LEVEL_KEY_RE = /^([A-Za-z0-9_-]+):[ \t]?(.*)$/;
const LIST_ITEM_RE = /^\s*-\s?(.*)$/;
const INDENTED_RE = /^\s+\S/;
/** Flow-sequence lists (`tags: []`, `tags: [weiqi, market-research]`) — this corpus's other
 * flat-list shape, alongside the block `- item` style handled below. */
const FLOW_LIST_RE = /^\[(.*)\]$/;

/**
 * Parse a markdown file's leading `---`-delimited frontmatter block plus the remaining body.
 * If the file has no frontmatter block, `data` is empty and `body` is the whole input.
 */
export function parseFrontmatter(raw: string): ParsedMarkdown {
  const lines = raw.split('\n');
  if ((lines[0] ?? '').trim() !== '---') {
    return { data: {}, body: raw };
  }

  const data: FrontmatterData = {};
  let i = 1;
  for (; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.trim() === '---') {
      i++;
      break;
    }
    const m = TOP_LEVEL_KEY_RE.exec(line);
    if (!m) continue; // defensively skip stray/malformed lines — corpora are messy
    const key = m[1] as string;
    const inlineValue = (m[2] ?? '').trim();
    if (inlineValue !== '') {
      const flow = FLOW_LIST_RE.exec(inlineValue);
      if (flow) {
        const inner = (flow[1] ?? '').trim();
        data[key] = inner === '' ? [] : inner.split(',').map((s) => stripQuotes(s.trim())).filter((s) => s.length > 0);
      } else {
        data[key] = stripQuotes(inlineValue);
      }
      continue;
    }

    // Empty inline value: peek ahead to decide list vs. nested-map vs. truly-empty.
    let j = i + 1;
    while (j < lines.length && (lines[j] ?? '').trim() === '') j++;
    const next = lines[j];
    if (j < lines.length && next !== undefined && next.trim() !== '---' && LIST_ITEM_RE.test(next)) {
      const items: string[] = [];
      while (j < lines.length) {
        const candidate = lines[j] ?? '';
        if (candidate.trim() === '---') break; // the frontmatter closing delimiter is never a list item
        const lm = LIST_ITEM_RE.exec(candidate);
        if (!lm) break;
        items.push(stripQuotes((lm[1] ?? '').trim()));
        j++;
      }
      data[key] = items;
      i = j - 1;
    } else if (j < lines.length && next !== undefined && INDENTED_RE.test(next)) {
      // Nested map (e.g. `references:`) — deliberately unparsed, skip past it.
      let k = j;
      while (k < lines.length && INDENTED_RE.test(lines[k] ?? '')) k++;
      i = k - 1;
    } else {
      data[key] = '';
    }
  }

  const body = lines.slice(i).join('\n');
  return { data, body };
}

/** Coerce a frontmatter value (scalar, list, or absent) into a flat string array. */
export function asList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.filter((v) => v.length > 0);
  return value.length > 0 ? [value] : [];
}
