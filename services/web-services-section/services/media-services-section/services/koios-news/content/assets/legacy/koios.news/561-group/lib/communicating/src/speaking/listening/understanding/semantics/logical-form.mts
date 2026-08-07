

import type { ParseResult } from "../../parsing/index.mjs";
import { scope } from "./scope.mjs";

export type LogicalFormNode =
  | { readonly kind: "pred"; readonly predicate: string; readonly args: readonly string[] }
  | { readonly kind: "not"; readonly body: LogicalFormNode }
  | { readonly kind: "quant"; readonly quantifier: "forall" | "exists" | "definite"; readonly variable: string; readonly restrictor: LogicalFormNode; readonly body: LogicalFormNode };

export interface LogicalFormReading {
  readonly label: "∀∃" | "∃∀";
  readonly form: LogicalFormNode;
  readonly render: string;
}

export interface LogicalFormResult {
  readonly clauses: readonly LogicalFormNode[];
  readonly readings: readonly LogicalFormReading[] | null;
  readonly scopeAmbiguous: boolean;
  readonly render: string;
}

function renderNode(node: LogicalFormNode): string {
  switch (node.kind) {
    case "pred":
      return `${node.predicate}(${node.args.join(", ")})`;
    case "not":
      return `¬${renderNode(node.body)}`;
    case "quant": {
      const q = node.quantifier === "forall" ? "∀" : node.quantifier === "exists" ? "∃" : "ι";
      const r = renderNode(node.restrictor);
      const b = renderNode(node.body);
      return `${q}${node.variable}(${r} → ${b})`;
    }
  }
}

/** Derive logical form from a parse result. */
export function logicalForm(result: ParseResult): LogicalFormResult {
  const clauses: LogicalFormNode[] = [];

  for (const w of result.words) {
    if (w.tags.includes("verb")) {
      const nsubj = result.arcs.find((a) => a.head === `word@${w.i}` && a.rel === "nsubj");
      const dobj = result.arcs.find((a) => a.head === `word@${w.i}` && a.rel === "dobj");
      const args: string[] = [];
      if (nsubj) args.push(nsubj.depText);
      if (dobj) args.push(dobj.depText);
      clauses.push({ kind: "pred", predicate: w.text.toLowerCase(), args });
    }
  }

  const scopeResult = scope(result);
  const readings: LogicalFormReading[] | null = scopeResult.scopeAmbiguous ? [] : null;

  if (readings !== null && scopeResult.readings.length > 0) {
    for (const r of scopeResult.readings) {
      const baseClause = clauses[0];
      if (baseClause) {
        readings.push({
          label: r.label,
          form: baseClause,
          render: `[${r.label}] ${renderNode(baseClause)}`,
        });
      }
    }
  }

  const render = readings !== null && readings.length > 0
    ? readings.map((r) => r.render).join(" | ")
    : clauses.map(renderNode).join("; ");

  return { clauses, readings, scopeAmbiguous: scopeResult.scopeAmbiguous, render };
}
