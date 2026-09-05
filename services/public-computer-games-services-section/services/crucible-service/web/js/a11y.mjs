/**
 * `a11y` — one shared aria-live announcer, and the single place `prefers-reduced-motion` is
 * decided (lantern's `a11y.js` pattern, copied in shape).
 */

let liveRegion = null;

export function initAnnouncer(doc = document) {
  liveRegion = doc.getElementById('aria-live') ?? doc.createElement('div');
  liveRegion.id = 'aria-live';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.className = 'sr-only';
  if (!liveRegion.parentNode) doc.body.appendChild(liveRegion);
  return liveRegion;
}

export function announce(text) {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  // Force a DOM mutation even if the text is repeated, so assistive tech re-announces it.
  window.requestAnimationFrame(() => {
    liveRegion.textContent = text;
  });
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}
