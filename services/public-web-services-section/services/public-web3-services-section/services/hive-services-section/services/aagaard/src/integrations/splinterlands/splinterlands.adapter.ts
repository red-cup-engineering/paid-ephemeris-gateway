export interface SplinterlandsCardDetail {
  readonly id: number;
  readonly name: string;
  readonly type: "Summoner" | "Monster";
  readonly color: string;
  readonly secondaryColor?: string;
  readonly editions: readonly number[];
  readonly mana: number;
}

export interface SplinterlandsOwnedCard {
  readonly uid: string;
  readonly cardDetailId: number;
  readonly edition: number;
  readonly level: number;
  readonly delegatedTo: string | null;
}

export interface SplinterlandsModernReadiness {
  readonly kind: "ready-owned-core" | "refuse";
  readonly reason: string;
  readonly summoners: readonly SplinterlandsOwnedCard[];
  readonly monsters: readonly SplinterlandsOwnedCard[];
  readonly compatibleElements: readonly string[];
}

type JsonRecord = Readonly<Record<string, unknown>>;

const OWNED_UID = /^C\d+-\d+-[A-Z0-9]+$/;
const ELEMENTS = new Set(["Red", "Blue", "Green", "White", "Black", "Gold", "Gray"]);

function record(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Splinterlands ${field} must be an object`);
  return value as JsonRecord;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Splinterlands ${field} must be nonempty text`);
  return value;
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new Error(`Splinterlands ${field} must be a positive integer`);
  return value;
}

function nonnegativeInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`Splinterlands ${field} must be a nonnegative integer`);
  return value;
}

function ownedCardUid(value: unknown): string {
  if (typeof value !== "string" || !OWNED_UID.test(value)) throw new Error("invalid owned Splinterlands card UID");
  return value;
}

export function parseSplinterlandsCardDetail(value: unknown): SplinterlandsCardDetail {
  const row = record(value, "card detail");
  const type = row["type"];
  if (type !== "Summoner" && type !== "Monster") throw new Error("Splinterlands card type must be Summoner or Monster");
  const color = text(row["color"], "card color");
  if (!ELEMENTS.has(color)) throw new Error("invalid Splinterlands card color");
  const editionsRaw = text(row["editions"], "card editions").split(",");
  const editions = editionsRaw.map((edition) => nonnegativeInteger(Number(edition), "card edition"));
  const stats = record(row["stats"], "card stats");
  const manaValue = stats["mana"];
  const mana = Array.isArray(manaValue) ? manaValue[0] : manaValue;
  if (typeof mana !== "number" || !Number.isFinite(mana) || mana < 0) throw new Error("Splinterlands card must have level-one mana");
  const secondary = row["secondary_color"];
  if (secondary !== undefined && secondary !== null && (typeof secondary !== "string" || !ELEMENTS.has(secondary))) throw new Error("invalid Splinterlands secondary card color");
  return Object.freeze({
    id: positiveInteger(row["id"], "card detail id"),
    name: text(row["name"], "card name"),
    type,
    color,
    ...(typeof secondary === "string" ? { secondaryColor: secondary } : {}),
    editions: Object.freeze(editions),
    mana,
  });
}

export function parseSplinterlandsOwnedCard(value: unknown): SplinterlandsOwnedCard {
  const row = record(value, "owned card");
  const delegated = row["delegated_to"];
  if (delegated !== null && delegated !== undefined && typeof delegated !== "string") throw new Error("invalid Splinterlands card delegation");
  return Object.freeze({
    uid: ownedCardUid(row["uid"]),
    cardDetailId: positiveInteger(row["card_detail_id"], "owned card detail id"),
    edition: nonnegativeInteger(row["edition"], "owned card edition"),
    level: positiveInteger(row["level"], "owned card level"),
    delegatedTo: typeof delegated === "string" ? delegated : null,
  });
}

export function assessSplinterlandsOwnedModernCore(
  ownedValues: readonly unknown[],
  detailValues: readonly unknown[],
  modernEditions: readonly number[],
): SplinterlandsModernReadiness {
  if (!Array.isArray(modernEditions) || modernEditions.length === 0 || !modernEditions.every((edition) => Number.isSafeInteger(edition) && edition > 0)) {
    throw new Error("Splinterlands modern editions must be positive integers");
  }
  const modern = new Set(modernEditions);
  const owned = ownedValues.map(parseSplinterlandsOwnedCard).filter((card) => card.delegatedTo === null && modern.has(card.edition));
  const ownedDetailIds = new Set(owned.map((card) => card.cardDetailId));
  const details = new Map(detailValues.filter((value) => {
    const row = record(value, "card detail");
    return typeof row["id"] === "number" && ownedDetailIds.has(row["id"]);
  }).map((value) => {
    const detail = parseSplinterlandsCardDetail(value);
    return [detail.id, detail] as const;
  }));
  const summoners = owned.filter((card) => details.get(card.cardDetailId)?.type === "Summoner");
  const monsters = owned.filter((card) => details.get(card.cardDetailId)?.type === "Monster");
  const compatibleElements = [...new Set(summoners.flatMap((summoner) => {
    const detail = details.get(summoner.cardDetailId);
    if (!detail) return [];
    if (detail.color === "Gold" || detail.color === "Gray") return ["Red", "Blue", "Green", "White", "Black"];
    return [detail.color, ...(detail.secondaryColor ? [detail.secondaryColor] : [])];
  }).filter((element) => monsters.some((monster) => {
    const detail = details.get(monster.cardDetailId);
    return detail?.color === element || detail?.color === "Gray";
  })))].sort();
  if (summoners.length === 0) return Object.freeze({ kind: "refuse", reason: "no undelegated owned Modern archon was observed", summoners: Object.freeze([]), monsters: Object.freeze(monsters), compatibleElements: Object.freeze([]) });
  if (monsters.length === 0 || compatibleElements.length === 0) return Object.freeze({ kind: "refuse", reason: "no undelegated owned Modern unit is compatible with an owned archon", summoners: Object.freeze(summoners), monsters: Object.freeze(monsters), compatibleElements: Object.freeze([]) });
  return Object.freeze({
    kind: "ready-owned-core",
    reason: "an owned, undelegated Modern archon and compatible unit core were observed; this inventory result must not queue, advise, select, or submit a protected-format battle",
    summoners: Object.freeze(summoners),
    monsters: Object.freeze(monsters),
    compatibleElements: Object.freeze(compatibleElements),
  });
}
