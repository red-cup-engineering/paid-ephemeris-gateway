/**
 * `chrome` — the 561 shelf's shared frame, vendored verbatim from
 * `sites/play.561.group/chrome/shelf-chrome.css` (the-suite-and-the-studio.md §5 directive 1,
 * "shelf chrome"). Vendor a copy, not a live import — house doctrine.
 *
 * `SHELF_CHROME_CSS` is the canonical file's text unchanged, plus one local override block:
 * TileSlots is a fixed dark-violet glass aesthetic with no light/dark toggle and no
 * `prefers-color-scheme` query of its own, so the chrome's own OS-driven light/dark switch
 * would otherwise pick a mismatched accent/border for a light-OS visitor. The override pins
 * `--shelf-accent`/`--shelf-border` to TileSlots' own `--violet-2`/`--glass-brd` tokens
 * (`--ink`/`--ink-dim` already resolve correctly unmodified, since TileSlots defines both
 * names itself).
 *
 * `SHELF_MARK_SVG` / `SHELF_FOOTER_LINE` are the house mark markup from `chrome/README.md`.
 * Placement here is deliberately narrow: `client.mts` drops the mark next to the persistent
 * map-HUD wordmark (`#map-wordmark`, present every time a player returns to the level map)
 * and the footer line on the login screen only — the board/gameplay screens' HUD is left
 * untouched to keep this a chrome-only, zero-risk change to the play loop.
 *
 * Re-vendor `SHELF_CHROME_CSS`'s body by diffing against the canonical source; the override
 * block below is local and should not be re-vendored over.
 */

export const SHELF_CHROME_CSS = `
:root {
  --shelf-font: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif;
  --shelf-size-sm: 0.78rem;
  --shelf-size-base: 0.85rem;
  --shelf-radius: 8px;

  --shelf-bg: var(--bg, #f6f3ee);
  --shelf-ink: var(--ink, #1c1a17);
  --shelf-ink-dim: var(--ink-dim, var(--text-dim, #6b665e));
  --shelf-border: var(--border, #d8d2c6);
  --shelf-accent: var(--accent, #a3402a);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --shelf-bg: var(--bg, #171512);
    --shelf-ink: var(--ink, #ece7de);
    --shelf-ink-dim: var(--ink-dim, var(--text-dim, #a39c8f));
    --shelf-border: var(--border, #3a352d);
    --shelf-accent: var(--accent, #e08a5c);
  }
}

:root[data-theme="dark"] {
  --shelf-bg: var(--bg, #171512);
  --shelf-ink: var(--ink, #ece7de);
  --shelf-ink-dim: var(--ink-dim, var(--text-dim, #a39c8f));
  --shelf-border: var(--border, #3a352d);
  --shelf-accent: var(--accent, #e08a5c);
}

.shelf-mark {
  width: 1.05rem;
  height: 1.05rem;
  flex: 0 0 auto;
  color: var(--shelf-accent);
  opacity: 0.65;
  vertical-align: -0.15rem;
}
.shelf-mark:hover, .shelf-mark:focus-visible { opacity: 1; }

.shelf-footer-line {
  font-family: var(--shelf-font);
  font-size: var(--shelf-size-sm);
  color: var(--shelf-ink-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0.5rem 0 0;
}
.shelf-footer-line .shelf-mark { width: 0.85rem; height: 0.85rem; }
.shelf-footer-line a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--shelf-border);
  text-underline-offset: 2px;
  border-radius: 3px;
}
.shelf-footer-line a:hover { color: var(--shelf-accent); text-decoration-color: var(--shelf-accent); }

.shelf-mark:focus-visible,
.shelf-footer-line a:focus-visible {
  outline: 2px solid var(--shelf-accent);
  outline-offset: 2px;
  text-decoration: none;
}

@media (prefers-reduced-motion: reduce) {
  .shelf-mark, .shelf-footer-line a { transition: none !important; }
}

/* --- local override: TileSlots has one fixed dark theme, no toggle -- pin chrome to it --- */
:root {
  --shelf-accent: var(--violet-2);
  --shelf-border: var(--glass-brd);
}
`;

export const SHELF_MARK_SVG = '<svg class="shelf-mark" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><ellipse cx="24" cy="24" rx="18" ry="11"/><path d="M13 17q11-6 22 0" stroke-width="1.3" opacity="0.6"/><path d="M11 24 14.25 21.5 17.5 24 20.75 21.5 24 24 27.25 21.5 30.5 24 33.75 21.5 37 24"/></svg>';

export const SHELF_FOOTER_LINE = '<p class="shelf-footer-line">' + SHELF_MARK_SVG + ' Part of the <a href="https://play.561.group">561 shelf</a>.</p>';
