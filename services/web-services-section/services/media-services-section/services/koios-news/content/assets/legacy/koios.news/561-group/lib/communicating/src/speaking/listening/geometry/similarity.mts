
const hypernymGraph: Readonly<Record<string, string>> = Object.freeze({
  dog: "mammal",
  cat: "mammal",
  mammal: "animal",
  animal: "organism",
  rose: "flower",
  flower: "plant",
  plant: "organism",
  organism: "entity",
  car: "vehicle",
  vehicle: "artifact",
  knife: "tool",
  tool: "artifact",
  artifact: "entity",
});

const synonymSets: readonly (readonly string[])[] = [
  ["car", "automobile"],
  ["happy", "glad"],
];

function synonymsOf(word: string): readonly string[] {
  const lower = word.toLowerCase();
  return synonymSets.find((set) => set.includes(lower)) ?? [lower];
}

function resolveToGraphWord(word: string): string | null {
  const lower = word.toLowerCase();
  if (isGraphNode(lower)) return lower;
  return synonymsOf(lower).find(isGraphNode) ?? null;
}

function hypernyms(word: string): readonly string[] {
  let current = resolveToGraphWord(word);
  if (current === null) return [];
  const chain = [current];
  while (Object.prototype.hasOwnProperty.call(hypernymGraph, current)) {
    current = hypernymGraph[current]!;
    chain.push(current);
  }
  return chain;
}

function commonAncestor(a: string, b: string): string | null {
  const chainA = hypernyms(a);
  const chainB = new Set(hypernyms(b));
  if (chainA.length === 0 || chainB.size === 0) return null;
  return chainA.find((node) => chainB.has(node)) ?? null;
}

export function similarity(a: string, b: string): number | null {
  if (synonymsOf(a).includes(b.toLowerCase()) || synonymsOf(b).includes(a.toLowerCase())) return 1;
  if (resolveToGraphWord(a) === null || resolveToGraphWord(b) === null) return null;

  const lca = commonAncestor(a, b);
  if (lca === null) return 0;
  const depthLca = hypernyms(lca).length;
  const depthA = hypernyms(a).length;
  const depthB = hypernyms(b).length;
  return (2 * depthLca) / (depthA + depthB);
}

function isGraphNode(word: string): boolean {
  return Object.prototype.hasOwnProperty.call(hypernymGraph, word)
    || Object.values(hypernymGraph).includes(word);
}
