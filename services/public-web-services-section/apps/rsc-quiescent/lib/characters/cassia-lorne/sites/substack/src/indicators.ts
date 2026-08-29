// Stage 1 of the diviner cycle: the day's atomic divinations.
//
// Deterministic first: the chart (our own ephemeris, provenance attached),
// the Moon's placement and lunation, the day's featured motion (an ingress
// or an aspect, chosen by the priority below), the seeded tarot draw, and
// the numerological reduction. No lection: Cassia's reading cites astrology,
// tarot, and number only. Then the synthesized signals: an
// element census computed from the chart, and — when a model key is
// present — a dream fragment and a color tone from the atomics model, each
// stamped with its synthesizer. Everything lands in
// backstage/indicators/<date>.json, the brief in backstage/briefs/<date>.md,
// and the spread (skill-compatible) in backstage/spreads/<date>.md.
//
// Run: pnpm run divine:indicators [-- YYYY-MM-DD]

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import {
  aspectsInChart,
  computeChart,
  findExactAspects,
  findIngresses,
  lunationOf,
  signPlacement,
  BODIES,
  type AspectHit,
  type Body,
  type Chart,
  type IngressEvent,
} from "@lenticule-science/divining/astrology";
import {
  dailySpread,
  reduceDate,
  type DailyIndicators,
  type FeaturedMotion,
  type SynthesizedSignal,
} from "@lenticule-science/divining/divination";
import {
  encodeDailyIndicators,
  encodeSpreadDocument,
  renderChartGlyphs,
  renderIndicatorsBrief,
} from "@lenticule-science/divining/divination/codecs";
import { hasProvider, makeAsk, hasImageProvider, makeAskImage } from "./ask.ts";
import { dateArgument, loadDivinerConfig, PROPERTY_ROOT, type DivinerConfig } from "./config.ts";
import { indicatorsFromCable, type CableIndicators } from "./cable-source.ts";

function dayWindow(dateIso: string): readonly [string, string] {
  return [`${dateIso}T00:00:00Z`, `${dateIso}T23:59:59Z`];
}

/**
 * The day's featured motion, by priority: a non-Moon ingress today; an
 * aspect exact today (tightest first); the Moon's ingress today; otherwise
 * the chart's tightest applying major aspect, falling back to the tightest
 * of any phase.
 */
export function featureMotion(chart: Chart, dateIso: string): FeaturedMotion {
  const [start, end] = dayWindow(dateIso);
  let moonIngress: IngressEvent | undefined;
  for (const body of BODIES) {
    const ingresses = findIngresses(body, start, end);
    if (ingresses.length === 0) continue;
    if (body === "moon") {
      moonIngress = ingresses[0];
      continue;
    }
    return Object.freeze({ kind: "ingress" as const, ingress: ingresses[0] as IngressEvent });
  }
  const hits = [...aspectsInChart(chart.bodies)].sort(
    (a, b) => Math.abs(a.offset) - Math.abs(b.offset),
  );
  for (const hit of hits) {
    const exact = findExactAspects(hit.bodyA, hit.bodyB, hit.aspect.angle, start, end);
    if (exact.length > 0) {
      return Object.freeze({
        kind: "aspect" as const,
        aspect: hit,
        exactTime: (exact[0] as { time: string }).time,
      });
    }
  }
  if (moonIngress) return Object.freeze({ kind: "ingress" as const, ingress: moonIngress });
  const applying = hits.find((hit) => hit.phase === "applying");
  const chosen = applying ?? hits[0];
  if (!chosen) throw new TypeError("no aspects in orb and no ingresses: widen the search");
  return Object.freeze({ kind: "aspect" as const, aspect: chosen });
}

/** The element census: a computed signal, synthesized by counting. */
export function elementCensus(chart: Chart): SynthesizedSignal {
  const counts: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  for (const body of BODIES) {
    const element = signPlacement(chart.bodies[body].longitude).sign.element;
    counts[element] = (counts[element] ?? 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [leadElement, leadCount] = ranked[0] as [string, number];
  const [secondElement, secondCount] = ranked[1] as [string, number];
  const text =
    leadCount === secondCount
      ? `${leadElement} and ${secondElement} share the lead, ${leadCount} placements each`
      : `${leadElement} leads with ${leadCount} of ${BODIES.length} placements; ${secondElement} follows with ${secondCount}`;
  return Object.freeze({
    kind: "elemental-signature" as const,
    text,
    synthesizer: "element census over the chart's sign placements",
  });
}

/**
 * A short, concrete image prompt built from the day's atomic indicators —
 * the same symbols the writer weaves into prose, rendered as visual
 * subject matter rather than interpretation. No text-in-image request
 * (image models render legible text unreliably); no astrology jargon.
 */
export function illustrationPrompt(brief: string, dreamSignal: SynthesizedSignal | undefined, colorSignal: SynthesizedSignal | undefined): string {
  const parts = [
    "A quick colored pencil sketch, the kind a person doodles in 5 to 15 minutes in a paper journal: loose, uneven linework, visible pencil strokes and light cross-hatching, patchy waxy color that doesn't fully fill every edge, a few stray or unfinished lines, faint visible paper texture and tooth. Not a digital painting, not airbrushed, not photorealistic, not highly detailed or polished — an amateur's honest sketch, imperfect and a little rough, not gallery-quality.",
    dreamSignal ? `Central image: ${dreamSignal.text}` : undefined,
    colorSignal ? `Color palette: ${colorSignal.text}` : undefined,
    "No text, no letters, no words, no astrology symbols or glyphs. No people's faces in close-up. A single clear focal subject, small and modest, on plain paper.",
  ].filter((part): part is string => Boolean(part));
  return parts.join(" ");
}

/**
 * Generate today's illustration from the day's dream/color-tone signals,
 * via the image provider configured in diviner.config.json. Returns null
 * (rather than throwing) whenever no illustration can be produced — no key,
 * transport failure, or a rejected request — matching the text atomics'
 * own "compute what's available" discipline: a missing or failing image
 * provider degrades the day's indicators, it never blocks them.
 */
export async function generateIllustration(
  brief: string,
  signals: readonly SynthesizedSignal[],
  config: Pick<DivinerConfig, "imageProvider" | "imageModel">,
  seed: number,
): Promise<Readonly<{ base64: string; mimeType: string; prompt: string; provider: string; model: string }> | null> {
  if (!hasImageProvider(config.imageProvider)) {
    console.error(`no key for image provider "${config.imageProvider}": no illustration`);
    return null;
  }
  const dream = signals.find((signal) => signal.kind === "dream");
  const colorTone = signals.find((signal) => signal.kind === "color-tone");
  const prompt = illustrationPrompt(brief, dream, colorTone);
  try {
    const askImage = makeAskImage({ provider: config.imageProvider, model: config.imageModel, seed });
    const image = await askImage(prompt);
    return Object.freeze({ ...image, prompt });
  } catch (error) {
    console.error(`illustration failed (${(error as Error).message}): writing indicators without one`);
    return null;
  }
}

async function modelSignals(
  brief: string,
  provider: string,
  model: string,
): Promise<readonly SynthesizedSignal[]> {
  const ask = makeAsk({ provider, model, temperature: 0.9, maxTokens: 200 });
  const signals: SynthesizedSignal[] = [];
  const atomics: readonly { kind: SynthesizedSignal["kind"]; prompt: string }[] = [
    {
      kind: "dream",
      prompt:
        `Given these divinatory indicators:\n\n${brief}\n\n` +
        "Write ONE brief dream image (one or two sentences, under 40 words) that compresses the day's symbolic tensions into a concrete, emotionally resonant fragment. " +
        "Concrete objects only; no interpretation, no advice, no astrology terms. Reply with the fragment alone.",
    },
    {
      kind: "color-tone",
      prompt:
        `Given these divinatory indicators:\n\n${brief}\n\n` +
        "Name ONE color-tone for the day (3 to 8 words, e.g. 'damp slate warming toward amber'). Reply with the phrase alone.",
    },
  ];
  for (const atomic of atomics) {
    try {
      const text = (await ask(atomic.prompt)).trim().replace(/^["']|["']$/g, "");
      if (text.length > 0 && text.length < 400) {
        signals.push(Object.freeze({ kind: atomic.kind, text, synthesizer: `${provider}:${model}` }));
      }
    } catch (error) {
      console.error(`atomic ${atomic.kind} failed: ${(error as Error).message}`);
    }
  }
  return signals;
}

export async function assembleIndicators(
  dateIso: string,
  options: Readonly<{ cableUrl?: string }> = {},
): Promise<DailyIndicators> {
  const config = loadDivinerConfig();
  const chartTime = `${dateIso}T${String(config.chartHourUtc).padStart(2, "0")}:00:00Z`;
  const chart = computeChart(chartTime);

  // The wire is canonical: read the capital off the cable when one is
  // configured; compute locally only what the cable did not answer. The
  // featured motion is editorial selection and stays local either way.
  let fromCable: CableIndicators | null = null;
  if (options.cableUrl) {
    try {
      fromCable = await indicatorsFromCable(options.cableUrl, dateIso);
      console.error(`cable answered: ${fromCable.witnessed.join(", ") || "(nothing)"}`);
    } catch (error) {
      console.error(`cable unreachable (${(error as Error).message}); computing locally`);
    }
  }

  const partial = {
    date: dateIso,
    chartTime,
    moon:
      fromCable?.moon ??
      Object.freeze({
        placement: signPlacement(chart.bodies.moon.longitude),
        lunation: lunationOf(chart.bodies),
      }),
    motion: featureMotion(chart, dateIso),
    tarot: fromCable?.tarot ?? dailySpread(dateIso, config.seedSalt),
    numerology: fromCable?.numerology ?? reduceDate(dateIso),
    signals: [elementCensus(chart)] as readonly SynthesizedSignal[],
  };
  if (hasProvider(config.atomicsProvider)) {
    const brief = renderIndicatorsBrief(Object.freeze({ ...partial }));
    const extra = await modelSignals(brief, config.atomicsProvider, config.atomicsModel);
    return Object.freeze({ ...partial, signals: Object.freeze([...partial.signals, ...extra]) });
  }
  console.error(`no key for provider "${config.atomicsProvider}": writing computed signals only`);
  return Object.freeze({ ...partial });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dateIso = dateArgument(argv);
  const config = loadDivinerConfig();
  const cableFlag = argv.indexOf("--from-cable");
  const cableUrl = cableFlag !== -1 ? argv[cableFlag + 1] : process.env.CASSIA_CABLE;
  const indicators = await assembleIndicators(dateIso, cableUrl ? { cableUrl } : {});
  const chart = computeChart(indicators.chartTime);

  const indicatorsPath = join(PROPERTY_ROOT, "backstage", "indicators", `${dateIso}.json`);
  mkdirSync(join(PROPERTY_ROOT, "backstage", "indicators"), { recursive: true });
  writeFileSync(indicatorsPath, encodeDailyIndicators(indicators));

  const brief = `${renderIndicatorsBrief(indicators)}\n## Chart (${chart.provenance.algorithm})\n\n${renderChartGlyphs(chart.bodies)}\n`;
  mkdirSync(join(PROPERTY_ROOT, "backstage", "briefs"), { recursive: true });
  writeFileSync(join(PROPERTY_ROOT, "backstage", "briefs", `${dateIso}.md`), brief);

  mkdirSync(join(PROPERTY_ROOT, "backstage", "spreads"), { recursive: true });
  writeFileSync(
    join(PROPERTY_ROOT, "backstage", "spreads", `${dateIso}.md`),
    encodeSpreadDocument({ spread: indicators.tarot, body: "" }),
  );

  const imageSeed = seedFromString(indicators.tarot.provenance.seed ?? `${dateIso}:${config.seedSalt}`);
  const illustration = await generateIllustration(brief, indicators.signals, config, imageSeed);
  if (illustration) {
    const extension = illustration.mimeType.includes("png") ? "png" : illustration.mimeType.includes("jpeg") || illustration.mimeType.includes("jpg") ? "jpg" : "img";
    const imagePath = join(PROPERTY_ROOT, "backstage", "images", `${dateIso}.${extension}`);
    mkdirSync(join(PROPERTY_ROOT, "backstage", "images"), { recursive: true });
    writeFileSync(imagePath, Buffer.from(illustration.base64, "base64"));
    writeFileSync(
      join(PROPERTY_ROOT, "backstage", "images", `${dateIso}.json`),
      `${JSON.stringify({ prompt: illustration.prompt, provider: illustration.provider, model: illustration.model, mimeType: illustration.mimeType, seed: imageSeed }, null, 2)}\n`,
    );
    console.log(`illustration → ${imagePath}`);
  }

  console.log(brief);
  console.log(`indicators → ${indicatorsPath}`);
  console.log(`seed: ${indicators.tarot.provenance.seed} (salt "${config.seedSalt}")`);
}

/**
 * A small deterministic string→int31 hash (djb2), for deriving an image
 * seed from the day's own tarot draw seed rather than introducing a second
 * source of randomness. Bounded to a signed 32-bit-safe range (LIVE-FOUND
 * 2026-07-17: Pollinations' seed parameter 500s on values above INT32_MAX,
 * e.g. the raw unsigned djb2 output; providers should not be assumed to
 * accept a full uint32).
 */
function seedFromString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  return hash % 2_147_483_647;
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop() as string);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
