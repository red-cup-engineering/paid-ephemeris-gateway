const SCHEME = /^[a-z][a-z0-9+.-]*:/iu;
const ADMITTED_SCHEMES = new Set(["http:", "https:", "mailto:"]);

/**
 * Admit a Markdown link destination for safe HTML projection.
 *
 * Input is one string; output is its trimmed destination, or null when it is
 * empty or has a non-web scheme. Relative paths and fragments are admitted.
 */
export function admitMarkdownLinkTarget(value) {
  if (typeof value !== "string") throw new TypeError("value must be a string");
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const scheme = trimmed.match(SCHEME)?.[0]?.toLowerCase();
  return scheme !== undefined && !ADMITTED_SCHEMES.has(scheme) ? null : trimmed;
}
