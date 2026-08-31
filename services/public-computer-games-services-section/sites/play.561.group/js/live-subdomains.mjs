// Subdomains this storefront may honestly link to as live.  The Cloudflare router owns
// the actual routes; this is the deliberate Play-local mirror of the catalog-facing
// subset.  Keep it alongside the router's route list and let test/honest-links.test.mts
// reject drift before either the catalog or Today page can send a player to a dead host.
//
// This module is intentionally small and dependency-free so both browser renderers use
// the same answer rather than carrying two copies that can silently diverge.
export const LIVE_SUBDOMAINS = new Set([
  'crucible',
  'solitaire',
  'gambling-trainer',
  'ruinfold',
  'durante',
  'farstone',
  'aletheon',
  'weiqi',
  'equivo',
  'you-are-conscious',
  'stoke',
  'parlor',
  'tidepool',
  'fearful',
  'casino',
]);
