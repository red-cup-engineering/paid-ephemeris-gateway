/**
 * @emsenn/organizing/accounting/report — the full ledger report suite, the
 * settled readings of the adjudicated accounting record-state (stage 9
 * substrate; the ported double-entry reporting layer of
 * dev/docs/notes/2026-06-22-trading-as-settling-over-value-categories.md §4 stage 9
 * and §7 "double-entry ledger engine → the `organizing` adjudicated record-state;
 * reports = settled readings").
 *
 * A report here is never a computation that mutates the books — it is a *reading* of
 * the already-settled `LoadedLedger` (the cleared record-state `institute`/`adjudicate`
 * formed). Eleven readings, consolidated from the current `src/ledger/report/*` into
 * one module for the rebuild wave:
 *
 *   - **balance / balsheet / incomestmt / cashflow** — the four financial statements,
 *     each a tree-rolled reading of the per-account running balances (cumulative, or
 *     the period delta) over a scoped window.
 *   - **register** — the chronological posting journal with a per-commodity running
 *     total (a bank-statement reading when scoped to one account).
 *   - **accounts / stats** — the structural readings (the account set; the journal
 *     summary, whose distinctive line is the count of HELD ⊤ contradictions).
 *   - **check** — the HEADLINE and the clearest expression of the package's no-halt
 *     thesis. Where beancount/hledger print the FIRST error and exit non-zero (halting
 *     the books), `checkReport` lists EVERY held problem — ⊤ contradictions on the
 *     worklist, failed checks, malformed lines — and **ALWAYS returns `exitCode: 0`**.
 *     The contradictions are carried, not fatal (the §4 anti-fetishism reading: a held
 *     ⊤ is evidence on the carrier, surfaced as a reconciliation worklist, never a
 *     thrown halt). `cohomologyVanishesInRegime`-style "no obstruction ⟹ glued" is the
 *     `ok` line; a non-empty worklist is the carried H¹ residue, still exit 0.
 *   - **print** — render parsed entries back to journal text (beancount/hledger).
 *   - **tree / filter** — the shared scaffolding (the account hierarchy with rolled-up
 *     subtree totals; the pure regex/period selectors).
 *
 * THE ONE DISPLAY RULE (the saturation point). A rational becomes a decimal
 * string ONLY at the render edge, and that edge is
 * `@emsenn/relating/economy` `toDecimalString`: never a float, never an
 * ad-hoc `.toString()`. Every report computes over the layer-1 `Money`
 * carrier, a graded exact rational value.
 *
 * Capability-preserving (CLAUDE.md normalization rule): this ports — never drops — the
 * eleven live readings of the current package; only the money substrate and the display
 * edge are re-homed.
 */

import type { LoadedLedger, Transaction, Posting, Entry, Directive, Registry } from "./ledger.mjs";
import { runningBalances, isTransaction, isDirective, isMalformed, postingHolding } from "./ledger.mjs";

import {
  type Money,
  addMoney,
  subMoney,
  negateMoney,
  isZeroMoney,
  commodityOf,
  toDecimalString,
} from "@emsenn/relating/economy";

// ════════════════════════════════════════════════════════════════════════════════════
// render — the SOLE rational→decimal display edge
// ════════════════════════════════════════════════════════════════════════════════════
// The saturation layer. A `Money` becomes a string ONLY here, via the
// layer-1 economy display edge. Reports compute in exact graded rationals and
// call these to print. `registry` is accepted for signature stability but the
// display precision is decided by `toDecimalString`, not threaded precision.

/** fmt — one Money to "1,234.56 USD" (number, a space, then its commodity). */
export const fmt = (amount: Money, _registry?: Registry | null): string =>
  `${toDecimalString(amount)} ${commodityOf(amount)}`;

/** fmtNum — just the number part (no commodity), for columnar layouts. */
export const fmtNum = (amount: Money, _registry?: Registry | null): string =>
  toDecimalString(amount);

/** fmtBag — a Map<commodity, Money> to an array of strings, sorted by commodity. Empty bag → []. */
export const fmtBag = (
  bag: ReadonlyMap<string, Money> | null | undefined,
  registry?: Registry | null,
): string[] =>
  [...(bag ?? new Map<string, Money>()).entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, amt]) => fmt(amt, registry));

/** renderTable — rows of cells to a left-aligned, space-padded monospace table. `align` is
 *  an array of "l"|"r" per column (default left); columns are sized to their widest cell. */
export const renderTable = (
  rows: readonly (readonly string[])[],
  { align = [] as string[], gap = 2 } = {},
): string => {
  if (rows.length === 0) return "";
  const cols = Math.max(...rows.map((r) => r.length));
  const width: number[] = [];
  for (let c = 0; c < cols; c++) width[c] = Math.max(...rows.map((r) => (r[c] ?? "").length));
  const pad = (s: string, w: number, a: string): string => (a === "r" ? s.padStart(w) : s.padEnd(w));
  return rows
    .map((r) =>
      r
        .map((cell, c) => pad(cell ?? "", width[c] ?? 0, align[c] ?? "l"))
        .join(" ".repeat(gap))
        .replace(/\s+$/, ""),
    )
    .join("\n");
};

/** indent — n levels of two-space indent. */
export const indent = (n: number): string => "  ".repeat(Math.max(0, n));

/** toCSV — rows of cells to CSV (quoting cells with commas/quotes/newlines). */
export const toCSV = (rows: readonly (readonly string[])[]): string =>
  rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");

// ════════════════════════════════════════════════════════════════════════════════════
// tree — the account hierarchy with rolled-up subtree totals
// ════════════════════════════════════════════════════════════════════════════════════
// Turn a flat Map<account, Map<commodity, Money>> into a hierarchy keyed by the
// colon-delimited account segments; each node carries its OWN per-commodity balance and
// a rolled-up SUBTREE TOTAL. Feeds balance / balsheet / incomestmt / cashflow.

export interface TreeNode {
  readonly name: string;
  readonly segment: string;
  readonly depth: number;
  own: Map<string, Money>;
  total: Map<string, Money>;
  children: Map<string, TreeNode>;
}

const node = (name: string, segment: string, depth: number): TreeNode => ({
  name,
  segment,
  depth,
  own: new Map(),
  total: new Map(),
  children: new Map(),
});

const addInto = (bag: Map<string, Money>, amt: Money): void => {
  const ccy = commodityOf(amt);
  const cur = bag.get(ccy);
  bag.set(ccy, cur ? addMoney(cur, amt) : amt);
};

/** buildTree — flat per-account balances → the rolled-up account tree. */
export function buildTree(balances: ReadonlyMap<string, ReadonlyMap<string, Money>>): TreeNode {
  const root = node("", "", -1);
  for (const [account, bag] of balances) {
    const parts = account.split(":");
    let cur = root;
    let path = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] ?? "";
      path = i === 0 ? part : `${path}:${part}`;
      let child = cur.children.get(part);
      if (!child) {
        child = node(path, part, i);
        cur.children.set(part, child);
      }
      cur = child;
    }
    for (const [, amt] of bag) addInto(cur.own, amt);
  }
  rollup(root);
  return root;
}

function rollup(n: TreeNode): void {
  const total = new Map<string, Money>();
  for (const [, amt] of n.own) addInto(total, amt);
  for (const [, child] of n.children) {
    rollup(child);
    for (const [, amt] of child.total) addInto(total, amt);
  }
  n.total = total;
}

/** walk — visit every node depth-first, children in sorted segment order. */
export function walk(root: TreeNode, visit: (node: TreeNode) => void): void {
  const rec = (n: TreeNode): void => {
    for (const seg of [...n.children.keys()].sort()) {
      const child = n.children.get(seg)!;
      visit(child);
      rec(child);
    }
  };
  rec(root);
}

/** subtree — the immediate child node for a top-level segment (e.g. "Assets"), or null. */
export function subtree(root: TreeNode, rootSegment: string): TreeNode | null {
  return root.children.get(rootSegment) ?? null;
}

// ════════════════════════════════════════════════════════════════════════════════════
// filter — pure period / regex selectors over transactions and balances
// ════════════════════════════════════════════════════════════════════════════════════
// Every function returns a NEW filtered collection, mutating nothing. Never throws on a
// bad regex (an unparseable pattern compiles to the never-matching `/a^/`).

const compileRe = (pat: string | null): RegExp | null => {
  if (!pat) return null;
  try {
    return new RegExp(pat);
  } catch {
    return /a^/;
  }
};

/** filterTransactions — select by account/period/status/payee (each criterion optional). */
export function filterTransactions(
  txns: readonly Transaction[],
  {
    account,
    begin,
    end,
    status,
    payee,
  }: {
    account?: string | null;
    begin?: string | null;
    end?: string | null;
    status?: string | string[] | null;
    payee?: string | null;
  } = {},
): Transaction[] {
  const accRe = compileRe(account ?? null);
  const payeeRe = compileRe(payee ?? null);
  const statusSet = status ? new Set(Array.isArray(status) ? status : [status]) : null;
  return txns.filter((t) => {
    if (begin && t.date < begin) return false;
    if (end && t.date >= end) return false;
    if (statusSet && !statusSet.has(t.flag ?? "")) return false;
    if (payeeRe && !payeeRe.test(`${t.payee ?? ""} ${t.narration}`)) return false;
    if (accRe && !t.postings.some((p) => accRe.test(p.account))) return false;
    return true;
  });
}

/** filterBalances — select balances by account regex, optionally collapsing to a max depth. */
export function filterBalances(
  balances: ReadonlyMap<string, ReadonlyMap<string, Money>>,
  { account, depth }: { account?: string | null; depth?: number | null } = {},
): Map<string, Map<string, Money>> {
  const accRe = compileRe(account ?? null);
  const out = new Map<string, Map<string, Money>>();
  for (const [acct, bag] of balances) {
    if (accRe && !accRe.test(acct)) continue;
    const key = depth ? acct.split(":").slice(0, depth).join(":") : acct;
    let target = out.get(key);
    if (!target) {
      target = new Map();
      out.set(key, target);
    }
    for (const [ccy, amt] of bag) {
      const cur = target.get(ccy);
      target.set(ccy, cur ? addMoney(cur, amt) : amt);
    }
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════════
// statement scaffolding — shared multi-section financial-statement helpers
// ════════════════════════════════════════════════════════════════════════════════════
// Each statement is: build the account tree, pull named root subtrees, print each as an
// indented section with a subtotal, then a closing net line. Amounts stay exact graded
// rationals until render.

/** sumMaps — sum a list of Map<ccy, Money> into one bag. */
export function sumMaps(maps: readonly (ReadonlyMap<string, Money> | null | undefined)[]): Map<string, Money> {
  const out = new Map<string, Money>();
  for (const m of maps) {
    for (const [ccy, amt] of m ?? []) {
      const cur = out.get(ccy);
      out.set(ccy, cur ? addMoney(cur, amt) : amt);
    }
  }
  return out;
}

/** negateBag — flip the sign of every amount in a bag (e.g. to show Income/Liabilities as positives). */
export function negateBag(bag: ReadonlyMap<string, Money> | null | undefined): Map<string, Money> {
  const out = new Map<string, Money>();
  for (const [ccy, amt] of bag ?? []) out.set(ccy, negateMoney(amt));
  return out;
}

/** sectionRows — an indented account/amount table for ONE root subtree, with a subtotal
 *  line. `flip` negates display amounts (Income, Liabilities and Equity read naturally as
 *  positives). */
export function sectionRows(
  root: TreeNode,
  segment: string,
  registry: Registry | null,
  { flip = false } = {},
): { rows: string[][]; total: Map<string, Money> } {
  const sub = subtree(root, segment);
  const rows: string[][] = [[segment, ""]];
  if (sub) {
    walk(sub, (n) => {
      if (n.total.size === 0) return;
      const bag = flip ? negateBag(n.total) : n.total;
      const amts = fmtBag(bag, registry);
      rows.push([indent(n.depth) + n.segment, amts[0] ?? ""]);
      for (let i = 1; i < amts.length; i++) rows.push(["", amts[i] ?? ""]);
    });
  }
  const subtotal = sub ? (flip ? negateBag(sub.total) : sub.total) : new Map<string, Money>();
  const subAmts = fmtBag(subtotal, registry);
  rows.push([indent(1) + `Total ${segment}`, subAmts[0] ?? "0"]);
  for (let i = 1; i < subAmts.length; i++) rows.push(["", subAmts[i] ?? ""]);
  return { rows, total: sub ? sub.total : new Map() };
}

/** netRow — a labelled net line from an already-summed bag. */
export function netRow(label: string, bag: ReadonlyMap<string, Money>, registry: Registry | null): string[][] {
  const amts = fmtBag(bag, registry);
  const rows: string[][] = [[label, amts[0] ?? "0"]];
  for (let i = 1; i < amts.length; i++) rows.push(["", amts[i] ?? ""]);
  return rows;
}

// ════════════════════════════════════════════════════════════════════════════════════
// balance — per-account balances, hierarchically rolled up; plus the period helpers
// ════════════════════════════════════════════════════════════════════════════════════

const allTxns = (led: LoadedLedger): Transaction[] => [...led.transactions, ...led.synthesized];

/** balancesCumulative — every posting up to (and including) `end` (or all, if no end). */
export function balancesCumulative(
  led: LoadedLedger,
  { end }: { end?: string | null } = {},
): ReadonlyMap<string, ReadonlyMap<string, Money>> {
  if (!end) return led.balances;
  const txns = allTxns(led).filter((t) => t.date <= end);
  return runningBalances(txns, led.registry);
}

/** balancesRange — the CHANGE per account over [begin, end]: balance through `end` minus
 *  balance strictly before `begin`. With no bounds it equals the cumulative balances. */
export function balancesRange(
  led: LoadedLedger,
  { begin, end }: { begin?: string | null; end?: string | null } = {},
): ReadonlyMap<string, ReadonlyMap<string, Money>> {
  if (!begin && !end) return led.balances;
  const txns = allTxns(led);
  const endBal = runningBalances(end ? txns.filter((t) => t.date <= end) : txns, led.registry);
  if (!begin) return endBal;
  const beginBal = runningBalances(txns.filter((t) => t.date < begin), led.registry);

  const out = new Map<string, Map<string, Money>>();
  for (const acct of new Set([...endBal.keys(), ...beginBal.keys()])) {
    const e = endBal.get(acct) ?? new Map<string, Money>();
    const b = beginBal.get(acct) ?? new Map<string, Money>();
    const bag = new Map<string, Money>();
    for (const ccy of new Set([...e.keys(), ...b.keys()])) {
      const ea = e.get(ccy);
      const ba = b.get(ccy);
      let delta: Money;
      if (ea && ba) delta = subMoney(ea, ba);
      else if (ea) delta = ea;
      else delta = negateMoney(ba!);
      if (!isZeroMoney(delta)) bag.set(ccy, delta);
    }
    if (bag.size) out.set(acct, bag);
  }
  return out;
}

export interface BalanceReport {
  tree: TreeNode;
}

/** balanceReport — the `bal` reading: cumulative per-account balances, scoped by
 *  account/depth/end, rolled into the account tree. */
export function balanceReport(
  led: LoadedLedger,
  opts: { account?: string | null; depth?: number | null; end?: string | null } = {},
): BalanceReport {
  const { account, depth, end } = opts;
  const cumOpts: { end?: string | null } = {};
  if (end != null) cumOpts.end = end;
  const filtOpts: { account?: string | null; depth?: number | null } = {};
  if (account != null) filtOpts.account = account;
  if (depth != null) filtOpts.depth = depth;
  const balances = filterBalances(balancesCumulative(led, cumOpts), filtOpts);
  return { tree: buildTree(balances) };
}

export function renderBalance(report: BalanceReport, led: LoadedLedger): string {
  const { tree } = report;
  const rows: string[][] = [];
  walk(tree, (node) => {
    if (node.total.size === 0) return;
    const amts = fmtBag(node.total, led.registry);
    rows.push([indent(node.depth) + node.segment, amts[0] ?? ""]);
    for (let i = 1; i < amts.length; i++) rows.push(["", amts[i] ?? ""]);
  });
  const totals = [...tree.total.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  rows.push(["", ""]);
  rows.push(["Total", totals.length && totals[0] ? fmt(totals[0][1], led.registry) : "0"]);
  for (let i = 1; i < totals.length; i++) rows.push(["", fmt(totals[i]![1], led.registry)]);
  return renderTable(rows, { align: ["l", "r"] });
}

// ════════════════════════════════════════════════════════════════════════════════════
// balsheet — point-in-time Assets / Liabilities / Equity
// ════════════════════════════════════════════════════════════════════════════════════
// Liabilities and Equity are shown flipped so they read as positives; the net line is
// Assets − (Liabilities + Equity), zero for books that balance.

export interface BalanceSheetReport {
  tree: TreeNode;
}

export function balanceSheetReport(led: LoadedLedger, opts: { end?: string | null } = {}): BalanceSheetReport {
  const cumOpts: { end?: string | null } = {};
  if (opts.end != null) cumOpts.end = opts.end;
  const tree = buildTree(balancesCumulative(led, cumOpts));
  return { tree };
}

export function renderBalanceSheet(report: BalanceSheetReport, led: LoadedLedger): string {
  const { tree } = report;
  const reg = led.registry;
  const assets = sectionRows(tree, "Assets", reg);
  const liabilities = sectionRows(tree, "Liabilities", reg, { flip: true });
  const equity = sectionRows(tree, "Equity", reg, { flip: true });

  const a = subtree(tree, "Assets")?.total ?? new Map<string, Money>();
  const le = sumMaps([
    negateBag(subtree(tree, "Liabilities")?.total ?? new Map<string, Money>()),
    negateBag(subtree(tree, "Equity")?.total ?? new Map<string, Money>()),
  ]);
  const net = new Map<string, Money>();
  for (const ccy of new Set([...a.keys(), ...le.keys()])) {
    const av = a.get(ccy);
    const lv = le.get(ccy);
    let v: Money;
    if (av && lv) v = subMoney(av, lv);
    else if (av) v = av;
    else v = negateMoney(lv!);
    if (!isZeroMoney(v)) net.set(ccy, v);
  }

  const rows = [
    ...assets.rows,
    ["", ""],
    ...liabilities.rows,
    ["", ""],
    ...equity.rows,
    ["", ""],
    ...netRow("Assets − (Liabilities + Equity)", net, reg),
  ];
  return renderTable(rows, { align: ["l", "r"] });
}

// ════════════════════════════════════════════════════════════════════════════════════
// incomestmt — Income and Expenses over a period, with net income
// ════════════════════════════════════════════════════════════════════════════════════
// By the accounting identity (all five roots sum to zero), net income = −(Income +
// Expenses); Income is shown flipped so revenue reads positive.

export interface IncomeStatementReport {
  tree: TreeNode;
}

export function incomeStatementReport(
  led: LoadedLedger,
  opts: { begin?: string | null; end?: string | null } = {},
): IncomeStatementReport {
  const rangeOpts: { begin?: string | null; end?: string | null } = {};
  if (opts.begin != null) rangeOpts.begin = opts.begin;
  if (opts.end != null) rangeOpts.end = opts.end;
  const tree = buildTree(balancesRange(led, rangeOpts));
  return { tree };
}

export function renderIncomeStatement(report: IncomeStatementReport, led: LoadedLedger): string {
  const { tree } = report;
  const reg = led.registry;
  const income = sectionRows(tree, "Income", reg, { flip: true });
  const expenses = sectionRows(tree, "Expenses", reg);

  const both = sumMaps([
    subtree(tree, "Income")?.total ?? new Map<string, Money>(),
    subtree(tree, "Expenses")?.total ?? new Map<string, Money>(),
  ]);
  const net = new Map<string, Money>();
  for (const [ccy, amt] of both) if (!isZeroMoney(amt)) net.set(ccy, negateMoney(amt));

  const rows = [
    ...income.rows,
    ["", ""],
    ...expenses.rows,
    ["", ""],
    ...netRow("Net income", net, reg),
  ];
  return renderTable(rows, { align: ["l", "r"] });
}

// ════════════════════════════════════════════════════════════════════════════════════
// cashflow — the CHANGE in cash (liquid asset) accounts over a period
// ════════════════════════════════════════════════════════════════════════════════════
// By default "cash" is the Assets root (override with a regex); shows the net movement
// per account = cash that flowed in (+) or out (−) over the window.

export interface CashflowReport {
  tree: TreeNode;
}

export function cashflowReport(
  led: LoadedLedger,
  opts: { begin?: string | null; end?: string | null; account?: string | null } = {},
): CashflowReport {
  const rangeOpts: { begin?: string | null; end?: string | null } = {};
  if (opts.begin != null) rangeOpts.begin = opts.begin;
  if (opts.end != null) rangeOpts.end = opts.end;
  const account = opts.account ?? "^Assets";
  const delta = filterBalances(balancesRange(led, rangeOpts), { account });
  return { tree: buildTree(delta) };
}

export function renderCashflow(report: CashflowReport, led: LoadedLedger): string {
  const { tree } = report;
  const reg = led.registry;
  const rows: string[][] = [["Cash flow (change over period)", ""]];
  walk(tree, (node) => {
    if (node.total.size === 0) return;
    const amts = fmtBag(node.total, reg);
    rows.push([indent(node.depth) + node.segment, amts[0] ?? ""]);
    for (let i = 1; i < amts.length; i++) rows.push(["", amts[i] ?? ""]);
  });
  const totals = [...tree.total.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  rows.push(["", ""]);
  rows.push(["Net cash flow", totals.length && totals[0] ? fmt(totals[0][1], reg) : "0"]);
  for (let i = 1; i < totals.length; i++) rows.push(["", fmt(totals[i]![1], reg)]);
  return renderTable(rows, { align: ["l", "r"] });
}

// ════════════════════════════════════════════════════════════════════════════════════
// register — chronological postings with a per-commodity running total
// ════════════════════════════════════════════════════════════════════════════════════
// Scoped to an account it reads like a bank statement; unscoped it is the full posting
// journal. The running total is per commodity, exact until rendered.

const safeRe = (p: string): RegExp => {
  try {
    return new RegExp(p);
  } catch {
    return /a^/;
  }
};

const byDate = (a: { date: string }, b: { date: string }): number =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : 0;

interface RegisterRow {
  date: string;
  description: string;
  account: string;
  amount: Money | null;
  total: Money | null;
}

export interface RegisterReport {
  rows: RegisterRow[];
}

export function registerReport(
  led: LoadedLedger,
  opts: {
    account?: string | null;
    begin?: string | null;
    end?: string | null;
    status?: string | null;
    payee?: string | null;
  } = {},
): RegisterReport {
  const filtOpts: {
    account?: string | null;
    begin?: string | null;
    end?: string | null;
    status?: string | null;
    payee?: string | null;
  } = {};
  if (opts.account != null) filtOpts.account = opts.account;
  if (opts.begin != null) filtOpts.begin = opts.begin;
  if (opts.end != null) filtOpts.end = opts.end;
  if (opts.status != null) filtOpts.status = opts.status;
  if (opts.payee != null) filtOpts.payee = opts.payee;
  const txns = filterTransactions(led.transactions, filtOpts).slice().sort(byDate);
  const { account } = opts;
  const accRe = account ? safeRe(account) : null;
  const running = new Map<string, Money>();
  const rows: RegisterRow[] = [];
  for (const t of txns) {
    let first = true;
    for (const p of t.postings) {
      if (accRe && !accRe.test(p.account)) continue;
      const w = postingHolding(p);
      if (w) {
        const ccy = commodityOf(w);
        const cur = running.get(ccy);
        running.set(ccy, cur ? addMoney(cur, w) : w);
      }
      rows.push({
        date: first ? t.date : "",
        description: first ? (t.payee ? `${t.payee} | ${t.narration}` : t.narration) : "",
        account: p.account,
        amount: w,
        total: w ? running.get(commodityOf(w)) ?? null : null,
      });
      first = false;
    }
  }
  return { rows };
}

export function renderRegister(report: RegisterReport, led: LoadedLedger): string {
  const table = report.rows.map((r) => [
    r.date,
    r.description,
    r.account,
    r.amount ? fmt(r.amount, led.registry) : "",
    r.total ? fmt(r.total, led.registry) : "",
  ]);
  return renderTable(table, { align: ["l", "l", "l", "r", "r"] });
}

// ════════════════════════════════════════════════════════════════════════════════════
// accounts — the sorted, de-duplicated set of every named account
// ════════════════════════════════════════════════════════════════════════════════════
// Named by a posting, an open/close, a pad, or a balance assertion. Optionally filtered
// by regex.

export interface AccountsReport {
  accounts: string[];
}

export function accountsReport(led: LoadedLedger, { account }: { account?: string | null } = {}): AccountsReport {
  const re = account ? safeRe(account) : null;
  const names = new Set<string>();
  for (const t of led.transactions) for (const p of t.postings) names.add(p.account);
  for (const d of led.directives) {
    if ("account" in d && typeof (d as { account?: unknown }).account === "string") {
      names.add((d as { account: string }).account);
    }
    if ("padAccount" in d && typeof (d as { padAccount?: unknown }).padAccount === "string") {
      names.add((d as { padAccount: string }).padAccount);
    }
  }
  const list = [...names].filter((n) => !re || re.test(n)).sort();
  return { accounts: list };
}

export function renderAccounts(report: AccountsReport): string {
  return report.accounts.join("\n");
}

// ════════════════════════════════════════════════════════════════════════════════════
// stats — a quick journal summary; the distinctive line is the count of HELD ⊤
// ════════════════════════════════════════════════════════════════════════════════════
// Counts transactions, postings, accounts, commodities, the date span, plus the no-halt
// ledger's signature: the number of held contradictions (⊤ on the worklist) and
// malformed records. A healthy ledger has zero held.

export interface StatsReport {
  transactions: number;
  postings: number;
  accounts: number;
  commodities: number;
  directives: number;
  span: string;
  malformed: number;
  held: number;
  synthesized: number;
}

export function statsReport(led: LoadedLedger): StatsReport {
  let postings = 0;
  const commodities = new Set<string>();
  let minDate: string | null = null;
  let maxDate: string | null = null;
  for (const t of led.transactions) {
    postings += t.postings.length;
    if (!minDate || t.date < minDate) minDate = t.date;
    if (!maxDate || t.date > maxDate) maxDate = t.date;
    for (const p of t.postings) {
      if (p.amount) commodities.add(commodityOf(p.amount));
      if (p.cost?.amount) commodities.add(commodityOf(p.cost.amount));
    }
  }
  return {
    transactions: led.transactions.length,
    postings,
    accounts: accountsReport(led, {}).accounts.length,
    commodities: commodities.size,
    directives: led.directives.length,
    span: minDate ? `${minDate} … ${maxDate}` : "(empty)",
    malformed: led.malformed.length,
    held: led.worklist.length,
    synthesized: led.synthesized.length,
  };
}

export function renderStats(s: StatsReport): string {
  const rows: [string, string | number][] = [
    ["Transactions", s.transactions],
    ["Postings", s.postings],
    ["Accounts", s.accounts],
    ["Commodities", s.commodities],
    ["Directives", s.directives],
    ["Date span", s.span],
    ["Pad-synthesized txns", s.synthesized],
    ["Malformed (held)", s.malformed],
    ["Contradictions ⊤ (held)", s.held],
  ];
  return rows.map(([k, v]) => `${String(k).padEnd(26)} ${v}`).join("\n");
}

// ════════════════════════════════════════════════════════════════════════════════════
// check — THE HEADLINE: the no-halt thesis (exitCode ALWAYS 0)
// ════════════════════════════════════════════════════════════════════════════════════
// Where beancount/hledger print the FIRST error and exit non-zero (halting the books),
// `checkReport` lists EVERY held problem — ⊤ contradictions on the worklist, failed
// checks, malformed lines — and ALWAYS exits 0. The contradictions are carried, not
// fatal: the books still rendered, and here is the reconciliation worklist (§4: a held
// ⊤ is evidence on the carrier, not a thrown halt). The carried worklist is the H¹
// residue; `ok` is the no-obstruction reading.

interface HeldItem {
  subject: unknown;
  predicate: unknown;
}

interface MalformedItem {
  reason: string;
  raw: string;
  source: unknown;
}

export interface CheckReport {
  ok: boolean;
  contradictions: HeldItem[];
  failures: HeldItem[];
  malformed: MalformedItem[];
  exitCode: 0;
}

// A settled cell reads back as its subject mark (carrying the evidence — residual
// amounts, computed vs asserted) and its predicate mark (the claim).
const heldItem = (entry: LoadedLedger["worklist"][number]): HeldItem => ({
  subject: entry.cell.subject.mark.value,
  predicate: entry.cell.predicate.mark.value,
});

export function checkReport(led: LoadedLedger): CheckReport {
  // ⊤ — held problems on the worklist: imbalanced transactions, mismatched balance
  // assertions, and any derived ⊤ (held contradiction). Carried, never fatal.
  const contradictions: HeldItem[] = led.worklist.map(heldItem);

  // f — failed checks: denied-only cells in clean. The engine derives none today (it has
  // no denial verb), so this is empty until imbalance is modelled as a genuine ⊤ cell.
  // Kept for shape stability.
  const failures: HeldItem[] = [];

  // malformed — lines that could not be parsed at all (carried, not dropped).
  const malformed: MalformedItem[] = led.malformed.map((m) => ({
    reason: m.reason,
    raw: m.raw,
    source: m.source,
  }));

  const ok = contradictions.length === 0 && failures.length === 0 && malformed.length === 0;
  // exitCode is ALWAYS 0 — the no-halt thesis: held contradictions are carried as a
  // reconciliation worklist, never a process-killing failure.
  return { ok, contradictions, failures, malformed, exitCode: 0 };
}

export function renderCheck(r: CheckReport): string {
  if (r.ok) return "✓ no held contradictions, no failed checks, no malformed lines.";
  const out: string[] = [];
  if (r.contradictions.length) {
    out.push(`⊤ held problems (${r.contradictions.length}) — the reconciliation worklist:`);
    for (const c of r.contradictions) {
      out.push(`  ⊤ [${JSON.stringify(c.predicate)}] ${JSON.stringify(c.subject)}`);
    }
  }
  if (r.failures.length) {
    out.push(`f failed checks (${r.failures.length}):`);
    for (const f of r.failures) {
      out.push(`  f [${JSON.stringify(f.predicate)}] ${JSON.stringify(f.subject)}`);
    }
  }
  if (r.malformed.length) {
    out.push(`malformed lines (${r.malformed.length}) — held, not dropped:`);
    for (const m of r.malformed) out.push(`  ; (${m.reason}) ${m.raw}`);
  }
  out.push("");
  out.push("(books still rendered; this is the worklist, not a halt — exit 0)");
  return out.join("\n");
}

// ════════════════════════════════════════════════════════════════════════════════════
// print — render parsed entries back to journal text (beancount / hledger)
// ════════════════════════════════════════════════════════════════════════════════════
// Amounts print at their display precision (via the `../../money` edge), so for
// terminating values parse → print → parse is a fixed point. Default format is
// beancount; hledger differs only in the header line.

const pa = (amt: Money | null | undefined): string =>
  amt ? `${toDecimalString(amt)} ${commodityOf(amt)}` : "";

const postingExpr = (p: Posting): string => {
  if (p.amount === null) return "";
  let s = pa(p.amount);
  if (p.cost) {
    const parts = [
      p.cost.amount ? pa(p.cost.amount) : "",
      (p.cost as { date?: string }).date ?? "",
      (p.cost as { label?: string }).label ? `"${(p.cost as { label?: string }).label}"` : "",
    ]
      .filter(Boolean)
      .join(", ");
    s += p.cost.kind === "total" ? ` {{${parts}}}` : ` {${parts}}`;
  }
  if (p.price) s += ` ${p.price.kind} ${pa(p.price.amount)}`;
  if (p.balanceAssertion) s += ` ${p.balanceAssertion.sole ? "==" : "="} ${pa(p.balanceAssertion.amount)}`;
  return s;
};

const postingLine = (p: Posting): string => {
  const virtual = (p.meta as Record<string, unknown>)?.["virtual"] as string | undefined;
  const acct = virtual === "(" ? `(${p.account})` : virtual === "[" ? `[${p.account}]` : p.account;
  const expr = postingExpr(p);
  return expr ? `  ${acct}  ${expr}` : `  ${acct}`;
};

const txnHeaderBeancount = (t: Transaction): string => {
  const flag = t.flag ?? "*";
  const desc = t.payee != null ? `"${t.payee}" "${t.narration}"` : `"${t.narration}"`;
  const tags = (t.tags ?? []).map((x) => `#${x}`).join(" ");
  const links = (t.links ?? []).map((x) => `^${x}`).join(" ");
  return [`${t.date} ${flag} ${desc}`, tags, links].filter(Boolean).join(" ");
};

const txnHeaderHledger = (t: Transaction): string => {
  const date = (t.date ?? "").replace(/-/g, "/");
  const flag = t.flag ? `${t.flag} ` : "";
  const code = t.code ? `(${t.code}) ` : "";
  const desc = t.payee != null ? `${t.payee} | ${t.narration}` : t.narration;
  return `${date}${t.time ? ` ${t.time}` : ""} ${flag}${code}${desc}`.trim();
};

const directiveLine = (d: Directive): string | null => {
  switch (d.directive) {
    case "open":
      return `${d.date} open ${d.account}${d.commodities.length ? "  " + d.commodities.join(",") : ""}`;
    case "close":
      return `${d.date} close ${d.account}`;
    case "commodity":
      return `${d.date ?? ""} commodity ${d.symbol}`;
    case "price":
      return `${d.date} price ${d.commodity} ${pa(d.amount)}`;
    case "pad":
      return `${d.date} pad ${d.account} ${d.padAccount}`;
    case "balance":
      return `${d.date} balance ${d.account}  ${pa(d.amount)}`;
    case "option":
      return `option "${d.key}" "${d.value}"`;
    case "include":
      return `include "${d.path}"`;
    default:
      return null;
  }
};

export function printEntries(
  entries: readonly Entry[],
  { format: fmtKind = "beancount" }: { format?: string } = {},
): string {
  const out: string[] = [];
  for (const e of entries) {
    if (isTransaction(e)) {
      const header = fmtKind === "hledger" ? txnHeaderHledger(e) : txnHeaderBeancount(e);
      out.push(header);
      for (const p of e.postings) out.push(postingLine(p));
      out.push("");
    } else if (isMalformed(e)) {
      out.push(`; MALFORMED (${e.reason}): ${e.raw}`);
    } else if (isDirective(e)) {
      const line = directiveLine(e);
      if (line) out.push(line);
    }
  }
  return out.join("\n").replace(/\n+$/, "\n");
}

export interface PrintReport {
  text: string;
}

export function printReport(entries: readonly Entry[], opts?: { format?: string }): PrintReport {
  return { text: printEntries(entries, opts) };
}

export function renderPrint(report: PrintReport): string {
  return report.text;
}

export default balanceReport;
