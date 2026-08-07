








export interface BundleMeta {
  readonly name: string;
  readonly code: string;
  readonly script: string;
  readonly direction: "ltr" | "rtl";
}

export interface BundleLexicon {
  readonly determiners: readonly string[];
  readonly prepositions: readonly string[];
  readonly pronouns: readonly string[];
  readonly conjunctions: readonly string[];
  readonly auxiliaries: readonly string[];
  readonly copula: readonly string[];
}

export interface SuffixRule {
  readonly pattern: string;
  readonly tag: string;
}

export interface BundleMorphology {
  readonly suffixRules: readonly SuffixRule[];
  readonly numberSuffixPattern: string;
  readonly verbFormRules: readonly SuffixRule[];
  readonly numberWords: readonly string[];
  readonly irregularPlurals?: Readonly<Record<string, string>>;
  readonly irregularVerbs?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

export interface PronounFeatures {
  readonly person: 1 | 2 | 3;
  readonly number: "sg" | "pl" | "both" | null;
  readonly gender?: "m" | "f" | "n";
}

export interface BundleReference {
  readonly pronouns: Readonly<Record<string, PronounFeatures>>;
  readonly nameGender?: Readonly<Record<string, "m" | "f" | "n">>;
}

export interface BundleAttachment {
  readonly determiner: "left" | "right";
  readonly adjective: "left" | "right";
  readonly subject: "left" | "right";
  readonly object: "left" | "right";
}

export interface BundleSegmentation {
  readonly sentenceTerminatorPattern: string;
  readonly abbreviations: readonly string[];
}

export interface RawBundle {
  readonly meta: BundleMeta;
  readonly lexicon: BundleLexicon;
  readonly morphology: BundleMorphology;
  readonly reference: BundleReference;
  readonly wordOrder: "SVO" | "SOV" | "VSO" | "VOS" | "OVS" | "OSV" | "free";
  readonly roleBy?: "case";
  readonly attachment: BundleAttachment;
  readonly segmentation: BundleSegmentation;
}

/** Compiled language bundle: raw data resolved into fast lookup functions. */
export interface CompiledBundle {
  readonly raw: RawBundle;
  readonly meta: BundleMeta;
  readonly wordOrder: RawBundle["wordOrder"];
  readonly roleBy?: "case";
  readonly attachment: BundleAttachment;
  readonly closedClassTags: (lowerWord: string) => readonly string[];
  readonly morphologyTags: (word: string) => readonly string[];
  readonly numberFeatures: (word: string, tags: readonly string[]) => readonly ("sg" | "pl")[];
  readonly verbForm: (word: string, tags: readonly string[]) => string | null;
  readonly isCopula: (lowerWord: string) => boolean;
  readonly isPronoun: (lowerWord: string) => boolean;
  readonly pronounFeatures: (lowerWord: string) => PronounFeatures | null;
  readonly isAbbreviation: (word: string) => boolean;
  readonly sentenceTerminators: RegExp;
}
