/**
 * Shared types for Lantern, mirroring the data model sketched in DESIGN.md. Pure type
 * declarations only — `erasableSyntaxOnly` friendly, no runtime code, no `enum`.
 */

export type RoomId = string; // wing-relative, forward-slashed path — e.g. "glossary/terms/atari.md"
export type WingId = string;
export type CardId = string;
export type HallId = string;
export type KataId = string;

/** Anki-style four-button self-grade, DESIGN.md §2. 1=Again, 2=Hard, 3=Good, 4=Easy. */
export type Grade = 1 | 2 | 3 | 4;

export type CardKind = 'cloze' | 'term-from-def' | 'dependency' | 'exercise' | 'teaches';

export type LightStage = 'full' | 'embers' | 'dim' | 'fogged';

/** Frontmatter values as the hand-rolled parser (frontmatter.mts) produces them: every key
 * maps to either a single scalar string or a flat list of strings. Nested maps (e.g. this
 * corpus's `references:` block) are deliberately not represented — see DESIGN.md §7. */
export type FrontmatterData = Record<string, string | string[]>;

export interface Room {
  id: RoomId;
  wingId: WingId;
  title: string;
  aliases: string[];
  kind: string;
  description?: string;
  body: string;
  /** Raw frontmatter, retained for card generation (§3) and hall attribute extraction (§1). */
  frontmatter: FrontmatterData;
  dateCreated?: string;
}

export interface Door {
  from: RoomId; // prerequisite
  to: RoomId; // dependent
  weight: 'hard' | 'soft';
  reason: string;
}

export interface Hall {
  id: HallId;
  intent: string[];
  rooms: RoomId[];
  stable: boolean;
}

export interface ReviewCard {
  id: CardId;
  roomId: RoomId;
  kind: CardKind;
  front: string;
  back: string;
  stability: number; // days
  difficulty: number; // 1..10, lower = easier
  lastReviewedAt?: number; // epoch day (integer), NEVER Date.now() inside domain logic
}

export interface Kata {
  id: KataId;
  path: RoomId[];
  origin: 'auto-hall' | 'custom';
  stability: number;
  difficulty: number;
  lastRunAt?: number; // epoch day
}

export interface WingConfig {
  id: WingId;
  /** Frontmatter fields to treat as hard-door candidates. Default: every field whose value(s)
   * are shaped like a `*.md` path (case-insensitive), minus `excludeFields`. */
  hardLinkFields?: string[];
  /** Fields never treated as doors even if `.md`-shaped — DESIGN.md §1 "Not doors" list. */
  excludeFields?: string[];
  /** Attribute fields FCA draws from. Default: ['cites', 'type', 'tags']. */
  attributeFields?: string[];
  /** Curator override groups (DESIGN.md §1): offered back to the compiler, never replacing the
   * derived halls, only supplementing them. */
  groups?: { name: string; match: (attrs: ReadonlySet<string>) => boolean }[];
}

export interface World {
  wingId: WingId;
  rooms: Room[];
  doors: Door[];
  halls: Hall[];
  cards: ReviewCard[];
  warnings: string[];
}

export const DEFAULT_ATTRIBUTE_FIELDS: readonly string[] = ['cites', 'type', 'tags'];
export const DEFAULT_EXCLUDE_FIELDS: readonly string[] = ['cites', 'references', 'defines', 'aliases', 'teaches'];
