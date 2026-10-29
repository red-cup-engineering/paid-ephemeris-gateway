import type { TufteStorefront } from '@red-cup-engineering/web-tufte-gui-services-section/storefront';
export interface GameCatalogEntry { readonly id: string; readonly displayName: string; readonly description?: string; readonly subdomain: string; readonly shelf?: string; readonly status: string; readonly statusNote?: string; readonly keywords?: readonly string[]; readonly entryPoints?: Readonly<Record<string, string>>; readonly liveProbe?: { readonly checkedAt: string; readonly ok: boolean; readonly httpStatus?: number | null }; }
export type GamePlayAvailability = { readonly kind: 'browser'; readonly href: string } | { readonly kind: 'unavailable'; readonly reason: string };
export const GLYPHS: Readonly<Record<string, string>>;
export const FALLBACK_GLYPH: string;
export function gameBrowserUrl(entry: GameCatalogEntry): string;
export function gamePlayAvailability(entry: GameCatalogEntry, liveSubdomains?: ReadonlySet<string>): GamePlayAvailability;
export function gamesWithAnyKeyword(entries: readonly GameCatalogEntry[], keywords: readonly string[]): GameCatalogEntry[];
export function gameStorefront(entries: readonly GameCatalogEntry[], options?: { title?: string; description?: string; liveSubdomains?: ReadonlySet<string> }): TufteStorefront;
