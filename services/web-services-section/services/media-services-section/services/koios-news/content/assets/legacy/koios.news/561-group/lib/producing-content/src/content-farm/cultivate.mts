/**
 * cultivate — one witnessed cultivation cycle for one property: demand
 * creates the assignment; the term-as-lens selects ONE source story from
 * the witnessed intake; the draft is asked for, judged by the gates, and
 * revised at most twice; the candidate is projected into the property's
 * content store ALWAYS draft: true; the run is recorded on the property's
 * append-only run trace; and an editorial work item is deposited to the
 * swarm hub when one is configured. Recurrence is the farm tick's (or
 * cron's) job — one cycle is one invocation, and time enters as the `at`
 * parameter.
 *
 * Subsumes the former sites/koios.news/src/mill.ts runMill (2026-06-12). The
 * unsupported-demand obstruction semantics are kept exactly: demand
 * creates assignments, never evidence — when the intake supports no term
 * in the beat, the lawful outcome is no article, witnessed. Withheld
 * candidates and obstructed runs ARE the compost: the run trace plus the
 * draft-true store retain every subpar output as learning substrate, and
 * `compost()` reads them back with their gate evidence.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { encodeFrontMatterDocument, type FrontMatterDocument } from "@emsenn/content/codecs/frontmatter";
import { copyedit, type CopyEdit } from "@emsenn/content/topology/copyedit";
import { newsSlug } from "@emsenn/content/topology/news";
import { makeAsk, type ContentProviderUsage } from "../computer/ask.mjs";
import { syndicationAdapters, type FetchLike, type SyndicationAdapter, type SyndicationItem } from "@emsenn/content/syndication";

import {
  draftPrompt, parseDraftReply, selectStory, termSupportCount, judgeDraft,
  type PostDraft, type FarmGate, type JudgeContext, type ArticleVoice,
} from "@emsenn/content/topology/article";
import { extractLinks } from "@emsenn/content/topology/gates";
import { demandTable, readSearchConsole, type DemandEntry, type ViewCountsReading } from "./demand.mjs";
import { isJsonRecord, parseLines, requireJsonValue, serializeLines } from "@emsenn/relating/writing";
import { candidateDocument, loadCandidates, runsPath, searchConsolePath, type FarmProperty } from "./property.mjs";

export type Ask = (prompt: string) => Promise<string> | string;

// ---------- the cultivation seams (the fiber over the cycle) ----------
// content-farm is the BASE engine; a specialization (e.g. the newsroom) is a
// FIBER over it — its special functions injected as these seam parameters. The
// cycle skeleton (demand → assignment, witnessed intake, the support-walk
// obstruction semantics, gate judging, usage accounting) is the base; `select`
// and `compose` are the two seams that vary by specialization. The defaults
// below reproduce the farm's single-story-markdown behavior EXACTLY, so the
// generalization is behavior-preserving for every existing caller.
// (The third seam — `record`, where the output carrier itself varies, e.g.
// markdown candidate vs claim-state assertion trace — is the deeper one and is
// staged separately; see dev/docs/notes/2026-06-15-newsroom-as-fiber-over-
// content-farm.md.)

/** The story-selection seam: from the assigned term (the lens) and the
 * witnessed intake, choose the subject story and its supporting context. The
 * farm default is the term-as-lens `selectStory` (ONE story); the newsroom
 * fiber clusters intake into N angles. */
export type SelectStory = (input: Readonly<{
  term: string;
  items: readonly SyndicationItem[];
  genericWords: ReadonlySet<string>;
}>) => Readonly<{ story: SyndicationItem; context: readonly SyndicationItem[] }>;

/** The composition seam: turn the selected story + context into a draft. The
 * LLM is reached through the injected `ask`; the result carries the draft and
 * the local copyedits applied to it. The farm default is a single `draftPrompt`
 * call followed by the deterministic copyedit closure; the newsroom fiber
 * synthesizes a brief over the clustered papers. */
export type ComposeDraft = (input: Readonly<{
  voice: ArticleVoice;
  term: string;
  story: SyndicationItem;
  context: readonly SyndicationItem[];
  ask: Ask;
  intakeTitles: readonly string[];
}>) => Promise<Readonly<{ draft: PostDraft; copyedits: readonly CopyEdit[] }>>;

/** The farm's default selection: the term-as-lens `selectStory`. */
const defaultSelectStory: SelectStory = ({ term, items, genericWords }) =>
  selectStory(term, items, { genericWords });

/** The farm's default composition: one `draftPrompt` LLM call, then the
 * deterministic editorial closure (floor-guarded at the length gate's ≥ 800).
 * No re-prompt — the LLM is spent ONCE. */
const defaultCompose: ComposeDraft = async ({ voice, term, story, context, ask, intakeTitles }) => {
  const rawDraft = parseDraftReply(await ask(draftPrompt({ voice, term, story, context })));
  // The story leads the sources so the closure always links it (the gate
  // requires the subject story cited); context follows as supporting sources.
  const intakeSources = [story, ...context].map((item) => ({ title: item.title, url: item.url }));
  const edited = copyedit(rawDraft.body, { intakeTitles, intakeSources, floor: 800 });
  const draft = edited.edits.length > 0 ? Object.freeze({ ...rawDraft, body: edited.body }) : rawDraft;
  return Object.freeze({ draft, copyedits: edited.edits });
};

// ---------- the editorial desk deposit ----------

/** One candidate's editorial work item, in the swarm hub's deposit shape:
 * requiredSkill names the gate model, office names the property. */
export type EditorialWorkItem = Readonly<{
  kind: "content.farm.work-item";
  workId: string;
  fields: Readonly<{
    title: string;
    office: string;
    requiredSkill: string;
    slug: string;
    summary: string;
  }>;
}>;

export type EditorialOffice = Readonly<{
  /** The office that owns the editorial work queue. */
  name: string;
  /** The model/skill whose board reviews produced candidates. Default "fable". */
  gateModel?: string;
}>;

export function editorialWorkItem(office: EditorialOffice, input: Readonly<{ slug: string; title: string; summary: string }>): EditorialWorkItem {
  return Object.freeze({
    kind: "content.farm.work-item" as const,
    workId: `${office.name}--${input.slug}`,
    fields: Object.freeze({
      title: `Editorial review: ${input.title}`,
      office: office.name,
      requiredSkill: office.gateModel ?? "fable",
      slug: input.slug,
      summary: input.summary.slice(0, 280),
    }),
  });
}

type HubFetchLike = (url: string, init?: { headers?: Record<string, string>; method?: string; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export type FarmHub = Readonly<{
  base: string;
  token: string;
  fetchImpl?: HubFetchLike;
}>;

export type DeskWitness = Readonly<{
  kind: "content.farm.desk:witness";
  at: string;
  workId: string;
  deposited: boolean;
  skipped: boolean;
}>;

export type DeskObstruction = Readonly<{
  kind: "content.farm.desk:obstruction";
  at: "hub-read" | "hub-deposit";
  reason: string;
}>;

export type DeskJudgment = DeskWitness | DeskObstruction;

/** Deposit one editorial work item, unless the hub already holds it open.
 * An unreachable hub is an obstruction value, never a crash. */
export async function depositEditorialWork(hub: FarmHub, item: EditorialWorkItem, options: Readonly<{ at: string; by?: string }>): Promise<DeskJudgment> {
  const fetchImpl: HubFetchLike = hub.fetchImpl ?? (fetch as unknown as HubFetchLike);
  const base = hub.base.replace(/\/$/, "");
  const board = item.fields.requiredSkill;
  let open: ReadonlyArray<{ workId: string }>;
  try {
    const response = await fetchImpl(`${base}/work-board/${encodeURIComponent(board)}/open`, {
      headers: { Authorization: `Bearer ${hub.token}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as { open?: ReadonlyArray<{ workId: string }> };
    open = Array.isArray(body.open) ? body.open : [];
  } catch (error) {
    return Object.freeze({ kind: "content.farm.desk:obstruction" as const, at: "hub-read" as const, reason: message(error) });
  }
  if (open.some((held) => held.workId === item.workId)) {
    return Object.freeze({ kind: "content.farm.desk:witness" as const, at: options.at, workId: item.workId, deposited: false, skipped: true });
  }
  try {
    const response = await fetchImpl(`${base}/work-board/${encodeURIComponent(board)}/deposit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${hub.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        workId: item.workId,
        fields: item.fields,
        options: { by: options.by ?? `${item.fields.office}-farm`, at: options.at },
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    return Object.freeze({ kind: "content.farm.desk:obstruction" as const, at: "hub-deposit" as const, reason: message(error) });
  }
  return Object.freeze({ kind: "content.farm.desk:witness" as const, at: options.at, workId: item.workId, deposited: true, skipped: false });
}

// ---------- the cycle ----------

export type CultivateOptions<W = CultivationResult> = Readonly<{
  /** The day stamp recorded on the candidate and the run trace. Time is a
   * parameter: the caller (CLI, farm tick, cron) owns the clock. */
  at: string;
  ask?: Ask;
  fetchImpl?: FetchLike;
  adapters?: Readonly<Record<string, SyndicationAdapter>>;
  dryRun?: boolean;
  /** Force the assignment to this term (the human's assignment; the
   * support walk is bypassed). */
  term?: string;
  beat?: string;
  provider?: string;
  model?: string;
  env?: Readonly<Record<string, string | undefined>>;
  /** Earned-attention reading folded into the demand table. */
  views?: ViewCountsReading;
  /** When configured, the produced candidate is deposited as an editorial
   * work item on the swarm hub. */
  hub?: FarmHub;
  /** Pre-fetched intake. When provided, the cycle skips its own fetch and
   * uses these items — so an orchestration can fetch once and run many cycles
   * (e.g. one per angle) over the same witnessed intake. */
  items?: readonly SyndicationItem[];
  /** The story-selection seam (default: the term-as-lens `selectStory`). A
   * specialization (the newsroom fiber) injects its own selection here. */
  select?: SelectStory;
  /** The composition seam (default: one `draftPrompt` call + the copyedit
   * closure). A specialization injects its own draft synthesis here. */
  compose?: ComposeDraft;
  /** The recording seam (default: write a markdown candidate + JSONL run trace
   * + hub work item, returning a CultivationResult). A specialization injects
   * its own output carrier here — e.g. the newsroom fiber emits a claim-state
   * assertion trace instead. When provided, it determines the cycle's witness
   * type `W`. */
  record?: RecordCycle<W>;
}>;

export type CultivationResult = Readonly<{
  kind: "content.farm.cultivation:witness";
  property: string;
  assignment: DemandEntry;
  story: SyndicationItem;
  draft: PostDraft;
  gates: readonly FarmGate[];
  /** The local post-production edits applied to the draft after the one
   * LLM call, in order (empty when the draft needed no repair). */
  copyedits: readonly CopyEdit[];
  shipped: boolean;
  slug: string;
  path: string | null;
  document: FrontMatterDocument;
  usage: Readonly<{ calls: number; tokens: number }>;
  /** Sources that obstructed during intake, as values. */
  intakeObstructions: readonly string[];
  desk?: DeskJudgment;
}>;

/** The obstruction carrier for a run demand could not warrant: demand
 * creates assignments, never evidence — when today's intake supports no
 * term in the beat, the lawful outcome is no article, witnessed. */
export type CultivationObstruction = Readonly<{
  kind: "content.farm.cultivation-obstruction";
  property: string;
  obstruction: "unsupported-demand";
  assignment: DemandEntry;
  evidence: string;
  usage: Readonly<{ calls: number; tokens: number }>;
  intakeObstructions: readonly string[];
}>;

export type CultivationJudgment = CultivationResult | CultivationObstruction;

export function isCultivationObstruction(result: CultivationJudgment): result is CultivationObstruction {
  return "obstruction" in result;
}

// ---------- the recording seam (the output-carrier fiber) ----------
// The cycle skeleton settles a story, a draft, and the gate verdict; HOW that
// settlement is carried out into the world — markdown candidate vs claim-state
// assertion trace — is the `record` seam. Everything the seam needs is gathered
// into a carrier-independent CycleSettlement; the side-effect policy (clock,
// whether to persist, the editorial hub) is the RecordContext.

/** Everything the cycle settles before recording, independent of the output
 * carrier — the input every record seam receives. */
export type CycleSettlement = Readonly<{
  property: FarmProperty;
  /** The settled assignment (term + beat) the cycle warranted. */
  assignment: DemandEntry;
  story: SyndicationItem;
  context: readonly SyndicationItem[];
  draft: PostDraft;
  copyedits: readonly CopyEdit[];
  gates: readonly FarmGate[];
  shipped: boolean;
  /** The URLs the draft may lawfully cite (the cycle's intake). */
  citableUrls: readonly string[];
  usage: Readonly<{ calls: number; tokens: number }>;
  intakeObstructions: readonly string[];
}>;

/** The side-effect policy for recording: the clock stamp, whether to persist,
 * and the optional editorial hub. */
export type RecordContext = Readonly<{
  at: string;
  dryRun: boolean;
  hub?: FarmHub;
}>;

/** The recording seam: carry the settled cycle out into the world as the
 * output type `W`, persisting unless `ctx.dryRun`. The farm default writes a
 * markdown candidate + JSONL run trace + hub work item and returns a
 * CultivationResult; a specialization (the newsroom fiber) emits its own
 * carrier (a claim-state assertion trace). */
export type RecordCycle<W> = (settlement: CycleSettlement, ctx: RecordContext) => Promise<W> | W;

/** The farm's default recording: a markdown candidate (always draft: true),
 * the append-only run trace, and — when a hub is configured — an editorial
 * work-item deposit. `shipped` records only the gate verdict; publication is
 * the orchestrator's editorial read. */
const defaultRecord: RecordCycle<CultivationResult> = async (s, ctx) => {
  const slug = newsSlug(s.draft.title).split("-").slice(0, 9).join("-") || `${s.property.name}-${ctx.at}`;
  const sameUrl = (left: string, right: string): boolean => left.replace(/\/+$/, "") === right.replace(/\/+$/, "");
  const cited = extractLinks(s.draft.body).filter((link) => s.citableUrls.some((url) => sameUrl(link, url)));
  const document = candidateDocument({
    draft: s.draft,
    term: s.assignment.term,
    beat: s.assignment.beat,
    ...(s.property.beatCategory?.[s.assignment.beat] === undefined ? {} : { category: s.property.beatCategory[s.assignment.beat]! }),
    author: s.property.author,
    termKey: s.property.termKey ?? "farm",
    slug,
    day: ctx.at,
    shipped: s.shipped,
    cited: [...new Set(cited)],
  });
  let path: string | null = null;
  let desk: DeskJudgment | undefined;
  if (!ctx.dryRun) {
    mkdirSync(s.property.contentDir, { recursive: true });
    path = join(s.property.contentDir, `${slug}.md`);
    writeFileSync(path, encodeFrontMatterDocument(document), "utf8");
    recordRun(s.property, {
      property: s.property.name,
      term: s.assignment.term,
      beat: s.assignment.beat,
      story: { title: s.story.title, url: s.story.url },
      slug,
      shipped: s.shipped,
      gates: s.gates.map((gate) => ({ gate: gate.gate, charge: gate.charge, evidence: gate.evidence })),
      // The copyedit audit: provenance grows monotonically — every local
      // repair is recorded with what it removed and what replaced it.
      copyedits: s.copyedits.map((change) => ({ op: change.op, before: change.before.slice(0, 80), after: change.after.slice(0, 80) })),
      usage: s.usage,
      t: ctx.at,
    });
    if (ctx.hub !== undefined) {
      desk = await depositEditorialWork(ctx.hub, editorialWorkItem(s.property, { slug, title: s.draft.title, summary: s.draft.summary }), { at: ctx.at });
    }
  }
  return Object.freeze({
    kind: "content.farm.cultivation:witness" as const,
    property: s.property.name,
    assignment: s.assignment,
    story: s.story,
    draft: s.draft,
    gates: s.gates,
    copyedits: s.copyedits,
    shipped: s.shipped,
    slug,
    path,
    document,
    usage: s.usage,
    intakeObstructions: s.intakeObstructions,
    ...(desk === undefined ? {} : { desk }),
  });
};

/** Witnessed intake for a beat: fetch every configured source through its
 * adapter, collecting items and (as values, never throws) the obstructions.
 * Exported so an orchestration (the newsroom's N-angle cycle) can fetch the
 * intake ONCE and feed it to many per-angle cultivate calls via `options.items`. */
export async function intakeItems(
  property: FarmProperty,
  beat: string,
  io: Readonly<{ fetchImpl?: FetchLike; adapters?: Readonly<Record<string, SyndicationAdapter>> }>,
): Promise<Readonly<{ items: readonly SyndicationItem[]; obstructions: readonly string[] }>> {
  const registry = io.adapters ?? syndicationAdapters;
  const items: SyndicationItem[] = [];
  const obstructions: string[] = [];
  for (const source of property.beatSources[beat] ?? []) {
    const adapter = registry[source.adapter];
    if (!adapter) {
      obstructions.push(`unknown adapter "${source.adapter}"`);
      continue;
    }
    try {
      const fetched = await adapter.fetch(source, io.fetchImpl === undefined ? {} : { fetchImpl: io.fetchImpl });
      items.push(...fetched);
    } catch (error) {
      obstructions.push(`${source.url ?? source.query ?? source.adapter}: ${message(error)}`);
    }
  }
  return Object.freeze({ items: Object.freeze(items), obstructions: Object.freeze(obstructions) });
}

function recordRun(property: FarmProperty, line: Record<string, unknown>): void {
  const path = runsPath(property);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, serializeLines([requireJsonValue(line, "farm run record")]), "utf8");
}

/** One cultivation cycle for one property. See the module header. */
export function cultivate(property: FarmProperty, options: CultivateOptions): Promise<CultivationJudgment>;
export function cultivate<W>(property: FarmProperty, options: CultivateOptions<W> & { record: RecordCycle<W> }): Promise<W | CultivationObstruction>;
export async function cultivate<W>(property: FarmProperty, options: CultivateOptions<W>): Promise<W | CultivationObstruction> {
  const genericWords = new Set(property.genericTermWords ?? []);
  const usage = { calls: 0, tokens: 0 };

  // 1. Demand creates the assignment.
  const posts = loadCandidates(property.contentDir);
  const demand = demandTable({
    posts,
    ...(options.views === undefined ? {} : { views: options.views }),
    searchConsole: readSearchConsole(searchConsolePath(property)),
    seeds: property.seeds,
    termKey: property.termKey ?? "farm",
  });
  const defaultBeat = options.beat ?? Object.keys(property.beatSources)[0] ?? "";
  const assignment = options.term !== undefined
    ? demand.find((entry) => entry.term === options.term)
      ?? Object.freeze({ beat: defaultBeat, term: options.term, score: 0, evidence: Object.freeze({ priority: 0, views: 0, impressions: 0, clicks: 0, covered: 0 }) })
    : (options.beat !== undefined ? demand.filter((entry) => entry.beat === options.beat) : demand)[0];
  if (assignment === undefined) throw new TypeError("demand table is empty; nothing to assign");

  // 2. Witnessed intake for the beat — pre-fetched items if the caller
  //    injected them, otherwise fetched here. Transport failures are
  //    obstruction values inside the cycle, never throws.
  const intake = options.items !== undefined
    ? Object.freeze({ items: options.items, obstructions: Object.freeze([]) as readonly string[] })
    : await intakeItems(property, assignment.beat, {
      ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
      ...(options.adapters === undefined ? {} : { adapters: options.adapters }),
    });

  const obstruct = (settled: DemandEntry, evidence: string): CultivationObstruction => {
    if (options.dryRun !== true) {
      recordRun(property, {
        property: property.name,
        obstruction: "unsupported-demand",
        term: settled.term,
        beat: settled.beat,
        evidence,
        usage,
        t: options.at,
      });
    }
    return Object.freeze({
      kind: "content.farm.cultivation-obstruction" as const,
      property: property.name,
      obstruction: "unsupported-demand" as const,
      assignment: settled,
      evidence,
      usage: Object.freeze({ ...usage }),
      intakeObstructions: intake.obstructions,
    });
  };

  if (intake.items.length === 0) {
    return obstruct(assignment, `no witnessed intake for beat ${assignment.beat}${intake.obstructions.length > 0 ? ` (${intake.obstructions.join("; ")})` : ""}`);
  }

  // 3. Demand meets supply: demand ranks the candidates, but the assignment
  //    settles on the highest-ranked term today's intake can actually
  //    support, judged on the term's distinctive words (beat-generic words
  //    prove nothing). An unsupported term stays in the table for the day
  //    its event arrives. A forced term is the human's assignment; the
  //    walk is bypassed.
  const threshold = property.supportThreshold ?? 3;
  let settled = assignment;
  if (options.term === undefined && termSupportCount(assignment.term, intake.items, genericWords) < threshold) {
    const supported = demand.find((entry) => entry.beat === assignment.beat && termSupportCount(entry.term, intake.items, genericWords) >= threshold);
    if (supported === undefined) {
      return obstruct(assignment, `no term in beat ${assignment.beat} reaches support ≥ ${threshold} in today's ${intake.items.length}-article intake (top term "${assignment.term}" supports ${termSupportCount(assignment.term, intake.items, genericWords)})`);
    }
    settled = supported;
  }

  // 3b. The term is the lens; the story is the subject. One article covers
  //     ONE source story — the rest of the intake is supporting context only.
  // Stories already cited in the content store are excluded from candidacy:
  // the same source event covered twice is a repetition, not a new article.
  const coveredUrls = new Set(posts.flatMap((post) => {
    const sources = post.document.frontMatter["sources"];
    return Array.isArray(sources) ? (sources as unknown[]).map(String) : [];
  }));
  const freshItems = intake.items.filter((article) => !coveredUrls.has(article.url));
  const select = options.select ?? defaultSelectStory;
  const { story, context } = select({ term: settled.term, items: freshItems.length > 0 ? freshItems : intake.items, genericWords });
  const cycleIntake = [story, ...context];
  const citableUrls = cycleIntake.map((article) => article.url);
  const judgeContext: JudgeContext = Object.freeze({
    storyUrl: story.url,
    intakeTitles: Object.freeze(cycleIntake.map((article) => article.title)),
    intakeTexts: Object.freeze(cycleIntake.map((article) => `${article.title} ${article.summary ?? ""}`)),
  });

  // 4. Compose the draft through the composition seam. The farm default is
  //    ONE draft call followed by the deterministic editorial closure (the LLM
  //    is spent once; the closure repairs form defects locally, no re-prompt,
  //    floor-guarded at the length gate's ≥ 800 so length-reducing operators
  //    never flip a passing length gate to failing — see defaultCompose and
  //    @emsenn/content/topology/copyedit for the operators and the closure
  //    laws). A specialization (the newsroom fiber) injects its own synthesis.
  const ask = options.ask ?? makeAsk({
    provider: options.provider ?? property.provider ?? "nim",
    ...(options.model ?? property.model ? { model: options.model ?? property.model } : {}),
    temperature: property.temperature ?? 0.65,
    maxTokens: property.maxTokens ?? 3000,
    ...(options.env === undefined ? {} : { env: options.env }),
    onUsage: (entry: ContentProviderUsage) => {
      usage.calls += 1;
      usage.tokens += entry.totalTokens ?? 0;
    },
  });
  const voice = property.voice;
  const compose = options.compose ?? defaultCompose;
  const { draft, copyedits } = await compose({
    voice, term: settled.term, story, context, ask,
    intakeTitles: judgeContext.intakeTitles ?? [],
  });
  const gates = judgeDraft(draft, settled.term, citableUrls, judgeContext);

  // 5. Record the settlement through the recording seam. The cycle settles a
  //    story, a draft, and the gate verdict; HOW that is carried into the world
  //    — markdown candidate (the farm default) vs claim-state assertion trace
  //    (the newsroom fiber) — is the seam's job. `shipped` records only the
  //    gate verdict; publication is the orchestrator's editorial read.
  const shipped = gates.every((gate) => gate.charge === "pass");
  const settlement: CycleSettlement = Object.freeze({
    property,
    assignment: settled,
    story,
    context,
    draft,
    copyedits,
    gates,
    shipped,
    citableUrls,
    usage: Object.freeze({ ...usage }),
    intakeObstructions: intake.obstructions,
  });
  const record = (options.record ?? defaultRecord) as RecordCycle<W>;
  return await record(settlement, {
    at: options.at,
    dryRun: options.dryRun === true,
    ...(options.hub === undefined ? {} : { hub: options.hub }),
  });
}

// ---------- the compost reading ----------

/** One replayed run-trace line, as recorded. */
export type FarmRunRecord = Readonly<Record<string, unknown>>;

/** Replay a property's run trace. Unparseable lines are held aside, not folded. */
export function replayRuns(path: string): readonly FarmRunRecord[] {
  if (!existsSync(path)) return Object.freeze([]);
  const runs: FarmRunRecord[] = [];
  for (const parsed of parseLines(readFileSync(path, "utf8"))) {
    if (isJsonRecord(parsed)) runs.push(Object.freeze(parsed));
  }
  return Object.freeze(runs);
}

/** One compost entry: a withheld or obstructed run, with its evidence.
 * Subpar output is retained as learning substrate — the run trace and the
 * withheld draft-true candidates ARE the compost; this is the reading. */
export type CompostEntry = Readonly<{
  kind: "content.farm.compost.entry";
  property?: string;
  term: string;
  beat: string;
  slug?: string;
  obstruction?: string;
  evidence: readonly string[];
  t?: string;
}>;

/** Read the compost out of a replayed run trace: every obstructed run
 * (with its obstruction evidence) and every withheld run (with the
 * evidence of each failing gate). Shipped runs are not compost. */
export function compost(runs: readonly FarmRunRecord[]): readonly CompostEntry[] {
  return Object.freeze(runs.flatMap((run): CompostEntry[] => {
    const term = typeof run.term === "string" ? run.term : null;
    const beat = typeof run.beat === "string" ? run.beat : null;
    if (term === null || beat === null) return [];
    const base = {
      kind: "content.farm.compost.entry" as const,
      ...(typeof run.property === "string" ? { property: run.property } : {}),
      term,
      beat,
      ...(typeof run.t === "string" ? { t: run.t } : {}),
    };
    if (typeof run.obstruction === "string") {
      return [Object.freeze({
        ...base,
        obstruction: run.obstruction,
        evidence: Object.freeze([typeof run.evidence === "string" ? run.evidence : "(no recorded evidence)"]),
      })];
    }
    if (run.shipped === false) {
      const gates = Array.isArray(run.gates) ? run.gates : [];
      const evidence = gates.flatMap((gate): string[] => {
        if (!gate || typeof gate !== "object") return [];
        const record = gate as Record<string, unknown>;
        if (record.charge !== "fail" || typeof record.gate !== "string") return [];
        return [`${record.gate}: ${typeof record.evidence === "string" ? record.evidence : "(no recorded evidence)"}`];
      });
      return [Object.freeze({
        ...base,
        ...(typeof run.slug === "string" ? { slug: run.slug } : {}),
        evidence: Object.freeze(evidence),
      })];
    }
    return [];
  }));
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
