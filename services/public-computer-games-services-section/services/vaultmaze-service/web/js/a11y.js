/**
 * `a11y` — the shared screen-reader announcer (face-spec item 6: "screen-reader announcements
 * for room state changes"). A single `aria-live="polite"` region, reused everywhere rather
 * than scattered ad hoc `alert()`s, so announcements queue naturally instead of interrupting
 * each other. Also home to `prefersReducedMotion()`, the one place that decides whether CSS
 * light-spread animation plays (face-spec item 2) — every caller asks here rather than
 * inlining its own `matchMedia` check.
 */

let liveRegion = null;

export function initAnnouncer(mountEl) {
  liveRegion = document.createElement('div');
  liveRegion.className = 'sr-only';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  mountEl.appendChild(liveRegion);
  return liveRegion;
}

/** Announce `text` to screen readers. Clears first so a repeated identical announcement (e.g.
 * "Room lit." twice in a row) still fires — some assistive tech dedupes unchanged live-region
 * text otherwise. */
export function announce(text) {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  // Force a reflow so the browser treats the re-set below as a genuine change.
  void liveRegion.offsetWidth;
  liveRegion.textContent = text;
}

/** Explicit override (from `state.reducedMotion`) takes precedence over the OS setting when
 * the player has chosen one in Settings; otherwise fall back to `prefers-reduced-motion`. */
export function prefersReducedMotion(explicitOverride) {
  if (explicitOverride === true) return true;
  if (explicitOverride === false) return false;
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Human-readable label for a room's light stage, used by both the SVG `<title>` tooltips and
 * screen-reader announcements so the two never drift apart. */
export function stageLabel(lightState) {
  if (!lightState || lightState.gated === false) return 'ungated';
  switch (lightState.stage) {
    case 'full':
      return 'fully lit';
    case 'embers':
      return 'glowing embers';
    case 'dim':
      return 'dim, fading';
    case 'fogged':
      return 'fogged over';
    default:
      return 'unknown';
  }
}
