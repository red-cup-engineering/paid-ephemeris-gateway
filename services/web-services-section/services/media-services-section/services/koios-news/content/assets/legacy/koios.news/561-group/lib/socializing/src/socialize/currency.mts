/**
 * currency - H1 coordination cost as social currency.
 *
 * This is the generalization that fell out of decide-by-market. A market price is one
 * reading of the socializing consensus limit; the residual spread-H1 is more general:
 * it is the field's coordination premium, a unit the society issues whenever a cell
 * does not glue. In ordinary market language it is spread/adverse selection. In
 * mutual-credit language it is the ledger entry the field owes itself. In Marxian
 * language it is social labor made exchangeable. In the debt/flow line running through
 * the French and Italian 1970s/1980s, it is command, subjectivation, and sign-flow made
 * measurable without collapsing the contradiction.
 *
 * The module intentionally keeps this as a reusable receipt. Today it consumes
 * decide-by-market's preference cells; institutionalization, recognition, mobilization,
 * publics, anomie, boundary-work, and legitimacy can later emit the same cell shape and
 * receive a comparable currency register.
 */
import {
  action,
  jsonResource,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";
import { admitSeed, descend } from "@emsenn/animating";

import {
  decideByMarket,
  type MarketDecisionCell,
  type MarketSettledGovernance,
} from "./govern.mjs";

export const COORDINATION_CURRENCY_ID = "socializing/currency/coordination";

export type CoordinationCurrencyLens =
  | "money-is-memory"
  | "mutual-credit"
  | "exchange-value"
  | "debt-subjectivation"
  | "semiotic-flow"
  | "social-factory";

export type CoordinationCurrencyCellStatus = "settled" | "contested";

export interface CoordinationCurrencyCellInput {
  readonly id?: string;
  readonly source?: string;
  readonly spreadH1: number;
  readonly noArbitrage?: boolean;
  readonly coherentConsensus?: boolean;
  readonly equilibrium?: JsonRecord;
  readonly pooled?: JsonRecord;
}

export interface CoordinationCurrencyCell {
  readonly id: string;
  readonly source: string;
  readonly spreadH1: number;
  readonly issued: number;
  readonly status: CoordinationCurrencyCellStatus;
  readonly noArbitrage: boolean;
  readonly coherentConsensus: boolean;
  readonly equilibrium?: JsonRecord;
  readonly pooled?: JsonRecord;
  readonly lenses: readonly CoordinationCurrencyLens[];
}

export interface CoordinationCurrency {
  readonly kind: "socializing.coordination-currency";
  readonly unit: "h1-coordination-credit";
  readonly cells: readonly CoordinationCurrencyCell[];
  readonly issued: number;
  readonly contested: number;
  readonly settled: number;
  readonly noArbitrage: boolean;
  readonly coherentConsensus: boolean;
  readonly lenses: readonly CoordinationCurrencyLens[];
  readonly theory: JsonRecord;
}

const LENSES: readonly CoordinationCurrencyLens[] = Object.freeze([
  "money-is-memory",
  "mutual-credit",
  "exchange-value",
  "debt-subjectivation",
  "semiotic-flow",
  "social-factory",
]);

const THEORY: JsonRecord = Object.freeze({
  moneyIsMemory: "the currency receipt is a remembered H1 residue, not a commodity primitive",
  mutualCredit: "each positive issue is the field crediting a future coordination obligation to itself",
  exchangeValue: "the issued unit is social labor made comparable through the market-settled cell",
  debtSubjectivation: "nonzero spread records an obligation that organizes conduct until it is settled",
  semioticFlow: "equilibrium is the sign-direction; spread is the blocked circulation of that sign",
  socialFactory: "the total issue measures coordination labor distributed across the whole social field",
});

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isMarketGovernance = (value: MarketSettledGovernance | readonly CoordinationCurrencyCellInput[]): value is MarketSettledGovernance =>
  isRecord(value) && value.kind === "socializing.market-governance" && Array.isArray(value.cells);

const nonnegativeInteger = (value: unknown, label: string): number => {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new TypeError(`${label}: expected a nonnegative integer H1 spread`);
  }
  return Number(value);
};

function marketCellId(cell: MarketDecisionCell): string {
  return `preference:${cell.a}>${cell.b}`;
}

function fromMarketCell(cell: MarketDecisionCell): CoordinationCurrencyCellInput {
  return Object.freeze({
    id: marketCellId(cell),
    source: "decide-by-market",
    spreadH1: cell.spreadH1,
    noArbitrage: cell.noArbitrage,
    coherentConsensus: cell.coherentConsensus,
    equilibrium: cell.equilibrium,
    pooled: cell.pooled,
  });
}

function normalizeCell(input: CoordinationCurrencyCellInput, index: number): CoordinationCurrencyCell {
  const spreadH1 = nonnegativeInteger(input.spreadH1, `coordination-currency cells[${index}].spreadH1`);
  const noArbitrage = input.noArbitrage ?? spreadH1 === 0;
  const coherentConsensus = input.coherentConsensus ?? spreadH1 === 0;
  const status: CoordinationCurrencyCellStatus = spreadH1 === 0 ? "settled" : "contested";
  return Object.freeze({
    id: input.id ?? `cell:${index}`,
    source: input.source ?? "coordination-cell",
    spreadH1,
    issued: spreadH1,
    status,
    noArbitrage,
    coherentConsensus,
    ...(input.equilibrium === undefined ? {} : { equilibrium: input.equilibrium }),
    ...(input.pooled === undefined ? {} : { pooled: input.pooled }),
    lenses: LENSES,
  });
}

export function coordinationCurrency(
  input: MarketSettledGovernance | readonly CoordinationCurrencyCellInput[],
): CoordinationCurrency {
  const cellsInput: readonly CoordinationCurrencyCellInput[] = isMarketGovernance(input)
    ? input.cells.map(fromMarketCell)
    : input;
  const cells = Object.freeze(cellsInput.map(normalizeCell));
  const issued = cells.reduce((sum: number, cell: CoordinationCurrencyCell) => sum + cell.issued, 0);
  const contested = cells.filter((cell: CoordinationCurrencyCell) => cell.status === "contested").length;
  return Object.freeze({
    kind: "socializing.coordination-currency" as const,
    unit: "h1-coordination-credit" as const,
    cells,
    issued,
    contested,
    settled: cells.length - contested,
    noArbitrage: cells.every((cell: CoordinationCurrencyCell) => cell.noArbitrage),
    coherentConsensus: cells.every((cell: CoordinationCurrencyCell) => cell.coherentConsensus),
    lenses: LENSES,
    theory: THEORY,
  });
}

function admitCurrencyInput(input: JsonValue): MarketSettledGovernance | readonly CoordinationCurrencyCellInput[] {
  if (isRecord(input) && input.kind === "socializing.market-governance" && Array.isArray(input.cells)) {
    return input as unknown as MarketSettledGovernance;
  }
  if (isRecord(input) && Array.isArray(input.cells)) {
    return input.cells.map((cell, index) => {
      if (!isRecord(cell)) throw new TypeError(`coordination-currency cells[${index}]: expected an object`);
      const admitted: {
        id?: string;
        source?: string;
        spreadH1: number;
        noArbitrage?: boolean;
        coherentConsensus?: boolean;
        equilibrium?: JsonRecord;
        pooled?: JsonRecord;
      } = {
        spreadH1: nonnegativeInteger(cell.spreadH1, `coordination-currency cells[${index}].spreadH1`),
      };
      if (typeof cell.id === "string") admitted.id = cell.id;
      if (typeof cell.source === "string") admitted.source = cell.source;
      if (typeof cell.noArbitrage === "boolean") admitted.noArbitrage = cell.noArbitrage;
      if (typeof cell.coherentConsensus === "boolean") admitted.coherentConsensus = cell.coherentConsensus;
      if (isRecord(cell.equilibrium)) admitted.equilibrium = cell.equilibrium;
      if (isRecord(cell.pooled)) admitted.pooled = cell.pooled;
      return Object.freeze(admitted) as CoordinationCurrencyCellInput;
    });
  }
  return decideByMarket(descend(admitSeed(input)).utterances);
}

const CURRENCY_SCHEMA: JsonRecord = Object.freeze({
  title: "CoordinationCurrency",
  type: "object",
  description:
    "H1 coordination cost issued as social currency. Accepts a decide-by-market receipt, { cells: [{ id, spreadH1, ... }] }, or a preference membrane; returns h1-coordination-credit issued per contested cell.",
});

const CURRENCY_INPUT_SCHEMA: JsonRecord = Object.freeze({
  title: "CoordinationCurrencyInput",
  type: ["string", "array", "object"],
  description:
    "a preference membrane, a market-governance receipt, or { cells: [{ id, source, spreadH1, noArbitrage, coherentConsensus, equilibrium, pooled }] }",
});

export const coordinationCurrencyAction: Action = action({
  verb: "coordination-currency",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Issue H1 coordination credits for contested social cells.",
  description:
    "Reads residual spread-H1 as social currency: zero H1 mints nothing; every nonzero contested cell issues h1-coordination-credit equal to its obstruction. This generalizes price/no-arbitrage beyond markets so institutionalization, recognition, mobilization, publics, anomie, boundary-work, and legitimacy can all report their coordination premium in the same unit.",
  domainSchema: CURRENCY_INPUT_SCHEMA,
  codomainSchema: CURRENCY_SCHEMA,
  run: (input: unknown): JsonValue =>
    jsonResource(coordinationCurrency(admitCurrencyInput(jsonResource(input, "coordination-currency input"))) as unknown as JsonValue, "coordination-currency"),
});
