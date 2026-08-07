/**
 * codecs/html/lint — packet-safety obligations for an SHP HTML packet: it must
 * be self-contained (no script, no external resource, no inline handler) and
 * carry its structural identities (the packet root, predicate classes, e/a
 * carrier coordinates). These are the "recover packet semantics without
 * executing anything" rules from the SHP spec; the rfc7992.* rules are the
 * RFC 7992 inhabitant constraints, surfaced as one profile.
 */
export type LintViolation = {
  rule: string;
  severity: "error" | "warning";
  message: string;
};

/**
 * The result of linting an SHP HTML packet: a list of rule violations, each
 * describing the rule, its severity, and a human-readable message. An empty
 * list means the packet satisfies every packet-safety and inhabitant rule.
 */
export type LintReport = {
  violations: readonly LintViolation[];
};

/**
 * Lints an HTML string against the SHP packet-safety and RFC 7992 inhabitant
 * rules: checks the doctype, lang, and charset declarations, rejects scripts,
 * styles, external stylesheets, external src references, and inline event
 * handlers, and verifies the article.semantic-hypertext-packet root plus
 * per-span predicate classes and e/a carrier attributes. Returns a LintReport
 * collecting every violation found.
 */
export function lint(html: string): LintReport {
  const violations: LintViolation[] = [];
  const fail = (rule: string, severity: LintViolation["severity"], message: string): void => {
    violations.push({ rule, severity, message });
  };
  const src = String(html);

  if (!/^\s*<!DOCTYPE html>/i.test(src)) {
    fail("rfc7992.doctype", "error", "document must begin with <!DOCTYPE html>");
  }
  if (!/<html\b[^>]*\slang=["']en["']/i.test(src)) {
    fail("rfc7992.lang", "error", '<html> must declare lang="en"');
  }
  if (!/<meta\b[^>]*\scharset=["']utf-8["']/i.test(src)) {
    fail("rfc7992.charset", "error", '<head> must declare <meta charset="utf-8">');
  }
  if (/<script[\s>]/i.test(src)) {
    fail("rfc7992.self-contained", "error", "document must not contain a <script> element");
  }
  if (/<style[\s>]/i.test(src)) {
    fail("rfc7992.self-contained", "error", "document must not contain a <style> element");
  }
  if (/<link\b[^>]*\srel=["']stylesheet["']/i.test(src)) {
    fail("rfc7992.self-contained", "error", "document must not link an external stylesheet");
  }
  if (/\ssrc=["']?(?!data:)[^"'\s>]+/i.test(src)) {
    fail("rfc7992.self-contained", "error", "document must not reference an external src");
  }
  if (/\son[a-z]+\s*=\s*["']/i.test(src)) {
    fail("rfc7992.self-contained", "error", "document must not contain inline event handlers");
  }

  if (!/class="semantic-hypertext-packet"/.test(src)) {
    fail("shp.root", "error", "document must carry the article.semantic-hypertext-packet root");
  }
  for (const tag of src.match(/<span\b[^>]*>/gi) ?? []) {
    if (!/\sclass="[^"]+"/.test(tag)) {
      fail("shp.span-class", "error", `span carries no predicate class: ${tag}`);
    }
    if (!/\sdata-e="/.test(tag) || !/\sdata-a="/.test(tag)) {
      fail("shp.span-carrier", "warning", `span carries no e/a carrier elements: ${tag}`);
    }
  }

  return { violations };
}

export default lint;
