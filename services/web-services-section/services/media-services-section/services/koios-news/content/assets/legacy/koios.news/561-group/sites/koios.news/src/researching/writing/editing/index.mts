// editing — gates, review candidates, and publishability.
//
// Editing owns judgment after a manuscript exists. The public audit remains in
// the publishing surface; this reading is the newsroom's internal state.

import type { GateReport } from "@emsenn/content/topology/news";

import type { KoiosPost } from "../../../content.mjs";
import { deskWorkItems, type DeskWorkItem } from "../../../desk.mjs";
import { auditReports } from "../../../surface.mjs";

export type EditingDepartmentReading = Readonly<{
  department: "editing";
  reports: readonly GateReport[];
  workItems: readonly DeskWorkItem[];
  publishableCount: number;
  withheldCount: number;
  reviewCandidateCount: number;
}>;

export function editingDepartmentReading(posts: readonly KoiosPost[]): EditingDepartmentReading {
  const reports = auditReports(posts);
  const workItems = deskWorkItems(posts);
  return Object.freeze({
    department: "editing",
    reports,
    workItems,
    publishableCount: reports.filter((report) => report.publishable).length,
    withheldCount: reports.filter((report) => !report.publishable).length,
    reviewCandidateCount: workItems.length,
  });
}

export {
  publishManuscript,
  normalizeManuscriptReferences,
  repairManuscriptHeadings,
  reviewManuscriptStandards,
} from "./standards.mjs";
export type {
  NormalizeManuscriptReferencesResult,
  PublishManuscriptResult,
  RepairManuscriptHeadingsResult,
  StandardsFinding,
  StandardsReview,
  StandardsSeverity,
} from "./standards.mjs";
