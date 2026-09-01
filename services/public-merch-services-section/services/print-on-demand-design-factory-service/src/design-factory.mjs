// Domain semantics: turn a design spec (plain data) into a print-ready SVG
// document. Pure functions only -- no filesystem, no network, no process
// state. Callers (scripts/) own all I/O.

// Print-ready canvas: 12in x 15in at 300 DPI, the standard full-front print
// area most POD garment providers (including Printify's Bella+Canvas 3001
// path) accept as a single upload.
export const CANVAS = { width: 3600, height: 4500, dpi: 300 };

export const COLORWAYS = {
  "mono-black": { bg: "none", fg: "#111111", accent: "#111111" },
  "mono-white": { bg: "none", fg: "#f7f5f0", accent: "#f7f5f0" },
  "accent-orange": { bg: "none", fg: "#111111", accent: "#e0562b" },
  "accent-mint": { bg: "none", fg: "#111111", accent: "#2ba58a" },
  "accent-navy": { bg: "none", fg: "#111111", accent: "#1f3a5f" },
};

export const LAYOUTS = [
  "stacked-bold",
  "badge-circle",
  "two-line-contrast",
  "minimal-caption",
  "arc-tag",
];

// Generated-art lane (LLM raster art, complementing the zero-cost SVG lane
// above). One flat-illustration style per niche, composed into a full
// generation prompt by buildArtPrompt(). No provider call happens here --
// this module stays pure; scripts/generate-image-art.mjs owns the I/O.
export const NICHE_ART_STYLES = {
  "programmer-humor": "a minimalist flat-vector illustration of a retro computer terminal on a desk, warm studio lighting, screen-print poster style",
  "cat-humor": "a charming flat-vector illustration of an original cartoon house cat (not based on any existing character or franchise) in a cozy home scene",
  "gym-humor": "a bold flat-vector illustration of gym equipment and a stylized weightlifter silhouette, dynamic poster composition",
  "teacher-humor": "a warm flat-vector illustration of a classroom scene with a chalkboard and a stack of books, friendly poster style",
  "plant-parent": "a lush flat-vector illustration of potted houseplants on a sunny windowsill, botanical poster style",
  "gamer-humor": "a playful flat-vector illustration of a retro game controller and dice, arcade poster style",
};

const ART_SAFETY_CLAUSE =
  "Bold flat color palette suited to screen-printing. No text, letters, or numbers anywhere in the image. " +
  "No logos, no brand names, no trademarked characters, no real people, nothing hateful. " +
  "Wholly original artwork, centered subject, print-ready poster composition, high contrast, transparent or single flat-color background.";

export function buildArtPrompt(spec) {
  if (spec.artPrompt) return spec.artPrompt;
  const style = NICHE_ART_STYLES[spec.niche];
  if (!style) throw new Error(`no art style declared for niche "${spec.niche}"`);
  const mood = spec.subphrase
    ? `that visually evokes the mood of "${spec.phrase}" (${spec.subphrase})`
    : `that visually evokes the mood of "${spec.phrase}"`;
  return `${style}, ${mood}. ${ART_SAFETY_CLAUSE}`;
}

const REQUIRED_FIELDS = [
  "id",
  "niche",
  "phrase",
  "layout",
  "colorway",
  "title",
  "description",
  "tags",
  "products",
];

export function validateDesign(spec) {
  if (!spec || typeof spec !== "object") {
    throw new Error("design spec must be an object");
  }
  for (const field of REQUIRED_FIELDS) {
    const value = spec[field];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);
    if (missing) {
      throw new Error(`design "${spec.id ?? "(no id)"}" missing required field: ${field}`);
    }
  }
  if (!LAYOUTS.includes(spec.layout)) {
    throw new Error(`design "${spec.id}" has unknown layout: ${spec.layout}`);
  }
  if (!COLORWAYS[spec.colorway]) {
    throw new Error(`design "${spec.id}" has unknown colorway: ${spec.colorway}`);
  }
  if (spec.tags.length > 13) {
    throw new Error(`design "${spec.id}" has ${spec.tags.length} tags, over the 13-tag Etsy-style cap`);
  }
  return spec;
}

export function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Simple greedy word-wrap by character budget. Good enough for bold display
// type where line balance matters more than exact kerning.
export function wrapText(text, maxCharsPerLine) {
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function svgDoc(children, colorway) {
  const { width, height } = CANVAS;
  const c = COLORWAYS[colorway];
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    c.bg !== "none" ? `<rect x="0" y="0" width="${width}" height="${height}" fill="${c.bg}"/>` : "",
    children,
    `</svg>`,
  ].join("\n");
}

function renderStackedBold(spec) {
  const c = COLORWAYS[spec.colorway];
  const lines = wrapText(spec.phrase.toUpperCase(), 14);
  const fontSize = lines.length <= 2 ? 480 : 360;
  const lineHeight = fontSize * 1.08;
  const totalHeight = lines.length * lineHeight;
  const startY = CANVAS.height / 2 - totalHeight / 2 + fontSize * 0.8;
  const textLines = lines
    .map(
      (line, i) =>
        `<text x="${CANVAS.width / 2}" y="${startY + i * lineHeight}" text-anchor="middle" ` +
        `font-family="'Arial Black', 'Helvetica Neue', sans-serif" font-weight="900" ` +
        `font-size="${fontSize}" fill="${c.fg}">${escapeXml(line)}</text>`
    )
    .join("\n");
  const bar = spec.subphrase
    ? `<rect x="${CANVAS.width / 2 - 300}" y="${startY + lines.length * lineHeight + 60}" width="600" height="24" fill="${c.accent}"/>` +
      `<text x="${CANVAS.width / 2}" y="${startY + lines.length * lineHeight + 220}" text-anchor="middle" ` +
      `font-family="Helvetica Neue, sans-serif" font-weight="600" letter-spacing="18" ` +
      `font-size="120" fill="${c.accent}">${escapeXml(spec.subphrase.toUpperCase())}</text>`
    : "";
  return svgDoc(textLines + "\n" + bar, spec.colorway);
}

function renderBadgeCircle(spec) {
  const c = COLORWAYS[spec.colorway];
  const cx = CANVAS.width / 2;
  const cy = CANVAS.height / 2;
  const r = 1500;
  const lines = wrapText(spec.phrase.toUpperCase(), 12);
  const fontSize = 200;
  const lineHeight = fontSize * 1.15;
  const totalHeight = lines.length * lineHeight;
  const startY = cy - totalHeight / 2 + fontSize * 0.75;
  const textLines = lines
    .map(
      (line, i) =>
        `<text x="${cx}" y="${startY + i * lineHeight}" text-anchor="middle" ` +
        `font-family="'Arial Black', sans-serif" font-weight="900" font-size="${fontSize}" fill="${c.fg}">${escapeXml(line)}</text>`
    )
    .join("\n");
  const ring =
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.accent}" stroke-width="36"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r - 90}" fill="none" stroke="${c.accent}" stroke-width="10"/>`;
  const caption = spec.subphrase
    ? `<text x="${cx}" y="${cy + r - 260}" text-anchor="middle" font-family="Helvetica Neue, sans-serif" ` +
      `font-weight="700" letter-spacing="14" font-size="90" fill="${c.accent}">${escapeXml(spec.subphrase.toUpperCase())}</text>`
    : "";
  return svgDoc(ring + "\n" + textLines + "\n" + caption, spec.colorway);
}

function renderTwoLineContrast(spec) {
  const c = COLORWAYS[spec.colorway];
  const parts = spec.subphrase ? [spec.phrase, spec.subphrase] : wrapText(spec.phrase, 16);
  const top = parts[0];
  const bottom = parts.slice(1).join(" ") || parts[0];
  const topSize = 220;
  const bottomSize = 560;
  const topY = CANVAS.height / 2 - 320;
  const bottomY = CANVAS.height / 2 + 360;
  return svgDoc(
    `<text x="${CANVAS.width / 2}" y="${topY}" text-anchor="middle" font-family="Helvetica Neue, sans-serif" ` +
      `font-weight="500" letter-spacing="22" font-size="${topSize}" fill="${c.accent}">${escapeXml(top.toUpperCase())}</text>\n` +
      `<text x="${CANVAS.width / 2}" y="${bottomY}" text-anchor="middle" font-family="'Arial Black', sans-serif" ` +
      `font-weight="900" font-size="${bottomSize}" fill="${c.fg}">${escapeXml(bottom.toUpperCase())}</text>`,
    spec.colorway
  );
}

function renderMinimalCaption(spec) {
  const c = COLORWAYS[spec.colorway];
  const cx = CANVAS.width / 2;
  const cy = CANVAS.height / 2;
  const fontSize = 220;
  const ruleWidth = 900;
  return svgDoc(
    `<line x1="${cx - ruleWidth / 2}" y1="${cy - 220}" x2="${cx + ruleWidth / 2}" y2="${cy - 220}" stroke="${c.fg}" stroke-width="6"/>\n` +
      `<text x="${cx}" y="${cy + 60}" text-anchor="middle" font-family="Helvetica Neue, sans-serif" ` +
      `font-weight="400" letter-spacing="10" font-size="${fontSize}" fill="${c.fg}">${escapeXml(spec.phrase)}</text>\n` +
      `<line x1="${cx - ruleWidth / 2}" y1="${cy + 220}" x2="${cx + ruleWidth / 2}" y2="${cy + 220}" stroke="${c.fg}" stroke-width="6"/>`,
    spec.colorway
  );
}

function renderArcTag(spec) {
  const c = COLORWAYS[spec.colorway];
  const cx = CANVAS.width / 2;
  const cy = CANVAS.height / 2;
  const arcId = `arc-${spec.id}`;
  const r = 2200;
  return svgDoc(
    `<defs><path id="${arcId}" d="M ${cx - r} ${cy + 400} A ${r} ${r} 0 0 1 ${cx + r} ${cy + 400}"/></defs>\n` +
      `<text font-family="'Arial Black', sans-serif" font-weight="900" font-size="320" fill="${c.fg}">` +
      `<textPath href="#${arcId}" startOffset="50%" text-anchor="middle">${escapeXml(spec.phrase.toUpperCase())}</textPath>` +
      `</text>\n` +
      (spec.subphrase
        ? `<text x="${cx}" y="${cy + 420}" text-anchor="middle" font-family="Helvetica Neue, sans-serif" ` +
          `font-weight="600" letter-spacing="16" font-size="140" fill="${c.accent}">${escapeXml(spec.subphrase.toUpperCase())}</text>`
        : ""),
    spec.colorway
  );
}

const RENDERERS = {
  "stacked-bold": renderStackedBold,
  "badge-circle": renderBadgeCircle,
  "two-line-contrast": renderTwoLineContrast,
  "minimal-caption": renderMinimalCaption,
  "arc-tag": renderArcTag,
};

export function renderDesign(spec) {
  validateDesign(spec);
  return RENDERERS[spec.layout](spec);
}
