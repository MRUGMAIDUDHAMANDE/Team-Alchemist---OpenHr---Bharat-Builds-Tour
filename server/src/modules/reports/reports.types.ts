import type { LeakageFinding } from "../leakage/leakage.types";

export type ReportSource = "REQUEST_MESSAGE" | "REVIEW_TEXT";
export type ReportStatus = "OPEN" | "REVIEWED" | "DISMISSED";

export interface LeakageReport {
  reportId: string;
  sourceType: ReportSource;
  sourceId: string;
  authorId: string;
  findings: LeakageFinding[];
  excerpt: string;
  status: ReportStatus;
  createdAt: string;
}
