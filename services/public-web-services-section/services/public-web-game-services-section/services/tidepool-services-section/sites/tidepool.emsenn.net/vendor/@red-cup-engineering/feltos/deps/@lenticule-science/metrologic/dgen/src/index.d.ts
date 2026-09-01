// Type declarations for @lenticule-science/metrologic/dgen (the barrel covers every subpath).
//
// The d-frame H¹-generator D_μ at each non-Scott-continuous firing, on @lenticule-science/metrologic/{dframe,verdier,
// obstruction}. A valued firing carries a stage and a bilattice value (a string label); values are opaque.

export type Value = string;

export interface Generator {
  value: Value;
  firingType: string;
  lPlus: number;
  lMinus: number;
  consistency: "con-fails-on-singleton-pair" | "trivial";
  totality: "trivial";
}
export function dframeGenerator(value: Value): Generator;

export interface ValuedFiring {
  stage: number;
  value: Value;
}

export interface H1Dframe {
  generators: Array<{ stage: number; value: Value; D: Generator }>;
  rank: number;
  lPlus: number;
  lMinus: number;
  structure: string;
}
export function h1Dframe(valuedFirings: ValuedFiring[]): H1Dframe;
export function shadow(
  valuedFirings: ValuedFiring[],
): { lPlus: number; lMinus: number; truthSide: string; falsitySide: string };
export function negateGenerator(D: { value: Value }): Generator;
export function linearlyIndependent(valuedFirings: ValuedFiring[]): boolean;
export function fromSettling(settling: object, values: Value[]): ValuedFiring[];
