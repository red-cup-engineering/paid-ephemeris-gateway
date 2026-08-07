/**
 * Views and innocence — the Hyland-Ong local-memory reading of chronicles.
 *
 * Hyland-Ong innocence says a strategy's next Proponent move is determined by
 * the Proponent view, not by the whole hidden history. Faggian-Hyland's bridge
 * from ludics to game semantics makes this live directly on our existing
 * chronicle grain: designs yield chronicles, and chronicles yield player views.
 *
 * No new strategy datatype is introduced. Actions already route through the
 * Design charge valuation (`positive`/`negative`/`daimon` from relating's
 * four-valued charge), so view-dependence is another reading of the same carrier.
 */
import {
  type Action,
  actionPolarity,
  sameAction,
} from "./action.mjs";
import {
  type Chronicle,
  designChronicles,
} from "./chronicle.mjs";
import { type Design } from "./design.mjs";
import {
  type Locus,
  locusKey,
  parent,
  sameLocus,
} from "./locus.mjs";
import { polarityName } from "../../../polarity.mjs";

export type PlayerPerspective = "proponent" | "opponent";

export interface PlayerView {
  readonly kind: "game.view";
  readonly perspective: PlayerPerspective;
  readonly actions: readonly Action[];
}

export interface InnocenceWitness {
  readonly kind: "game.innocence:witness";
  readonly design: Design;
  readonly decisions: readonly InnocentDecision[];
}

export interface InnocenceObstruction {
  readonly kind: "game.innocence-obstruction";
  readonly design: Design;
  readonly view: PlayerView;
  readonly expected: Action;
  readonly actual: Action;
  readonly reason: string;
}

export interface InnocentDecision {
  readonly view: PlayerView;
  readonly next: Action;
}

export type InnocenceJudgment = InnocenceWitness | InnocenceObstruction;

const ownerOf = (action: Action): PlayerPerspective =>
  polarityName(actionPolarity(action)) === "negative" ? "opponent" : "proponent";

const makeView = (perspective: PlayerPerspective, actions: readonly Action[]): PlayerView =>
  Object.freeze({
    kind: "game.view" as const,
    perspective,
    actions: Object.freeze([...actions]),
  });

const justifierIndex = (actions: readonly Action[], move: Action): number => {
  const parentLocus: Locus | null = parent(move.locus);
  if (parentLocus === null) return -1;
  for (let i = actions.length - 1; i >= 0; i--) {
    if (sameLocus(actions[i]!.locus, parentLocus)) return i;
  }
  return -1;
};

const viewActions = (
  actions: readonly Action[],
  perspective: PlayerPerspective,
): readonly Action[] => {
  if (actions.length === 0) return Object.freeze([]);
  const last = actions[actions.length - 1]!;
  const prior = actions.slice(0, -1);
  if (ownerOf(last) === perspective) {
    return Object.freeze([...viewActions(prior, perspective), last]);
  }
  const justifiedBy = justifierIndex(prior, last);
  if (justifiedBy < 0) {
    return Object.freeze([last]);
  }
  return Object.freeze([
    ...viewActions(prior.slice(0, justifiedBy + 1), perspective),
    last,
  ]);
};

export const viewOfChronicle = (
  chronicle: Chronicle,
  perspective: PlayerPerspective = "proponent",
): PlayerView => makeView(perspective, viewActions(chronicle.actions, perspective));

export const viewsOfDesign = (
  design: Design,
  perspective: PlayerPerspective = "proponent",
): readonly PlayerView[] =>
  Object.freeze(designChronicles(design).map((c) => viewOfChronicle(c, perspective)));

const actionKey = (action: Action): string =>
  `${action.variety}@${locusKey(action.locus)}[${action.ramification.join(",")}]`;

const viewKey = (view: PlayerView): string =>
  `${view.perspective}:${view.actions.map(actionKey).join(";")}`;

/**
 * Judge Proponent innocence over the finite chronicle presentation of a Design:
 * whenever two chronicle prefixes have the same Proponent view, the next
 * Proponent action must be the same. This is the finite, carrier-level analogue
 * of the Hyland-Ong innocence condition.
 */
export function innocenceJudgment(design: Design): InnocenceJudgment {
  const decisions = new Map<string, InnocentDecision>();

  for (const chronicle of designChronicles(design)) {
    for (let i = 0; i + 1 < chronicle.actions.length; i++) {
      const next = chronicle.actions[i + 1]!;
      if (ownerOf(next) !== "proponent") continue;
      const view = viewOfChronicle(
        { kind: "game.chronicle" as const, actions: chronicle.actions.slice(0, i + 1) },
        "proponent",
      );
      const key = viewKey(view);
      const prior = decisions.get(key);
      if (prior !== undefined && !sameAction(prior.next, next)) {
        return Object.freeze({
          kind: "game.innocence-obstruction" as const,
          design,
          view,
          expected: prior.next,
          actual: next,
          reason: "same Proponent view admits two different next Proponent actions",
        });
      }
      decisions.set(key, Object.freeze({ view, next }));
    }
  }

  return Object.freeze({
    kind: "game.innocence:witness" as const,
    design,
    decisions: Object.freeze([...decisions.values()]),
  });
}

export const isInnocent = (design: Design): boolean =>
  innocenceJudgment(design).kind === "game.innocence:witness";
