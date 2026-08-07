import { createImmutableContentCustody } from "@red-cup-engineering/immutable-content-custody-service";
import { createCategoryReferenceIndex } from "@red-cup-engineering/category-reference-index-service";

export function witnessJournalNetworkOptions() {
  return Object.freeze({
    custody: createImmutableContentCustody(),
    categoryIndex: createCategoryReferenceIndex(),
  });
}

export function createEphemeralWitnessJournalNetworkOptions() {
  const objects = new Map();
  const categories = new Map();
  const custody = Object.freeze({
    async put({ ni, bytes, mediaType = "application/octet-stream" }) {
      objects.set(ni, Object.freeze({ ni, bytes: Buffer.from(bytes), mediaType }));
      return Object.freeze({ ni, mediaType });
    },
    async get(referenceOrNi) {
      const ni = typeof referenceOrNi === "string" ? referenceOrNi : referenceOrNi?.ni;
      const retained = objects.get(ni);
      return retained === undefined ? null : Object.freeze({ ...retained, bytes: Buffer.from(retained.bytes) });
    },
  });
  const categoryIndex = Object.freeze({
    async add({ predicate = "urn:emsenn:witness-journal:category", category, ni }) {
      const key = `${predicate}\n${category}`;
      const values = categories.get(key) ?? new Set();
      values.add(ni);
      categories.set(key, values);
      return Object.freeze({ predicate, category, ni });
    },
    async query(category, { predicate = "urn:emsenn:witness-journal:category" } = {}) {
      const values = categories.get(`${predicate}\n${category}`) ?? new Set();
      return Object.freeze({ references: Object.freeze([...values].map((ni) => Object.freeze({ ni }))), continuationToken: undefined });
    },
  });
  return Object.freeze({ custody, categoryIndex });
}
