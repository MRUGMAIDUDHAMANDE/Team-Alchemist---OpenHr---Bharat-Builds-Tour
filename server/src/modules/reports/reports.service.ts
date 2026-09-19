import { randomUUID } from "node:crypto";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { decodePageCursor, encodePageCursor } from "../availability/availability.pagination";
import { scanText } from "../leakage/scanner";
import type { reportsRepository } from "./reports.repository";
import type { LeakageReport, ReportSource, ReportStatus } from "./reports.types";

export type ReportStore = Pick<typeof reportsRepository, "create" | "getById" | "listByStatus" | "setStatus">;

export interface ReportPage {
  items: LeakageReport[];
  nextCursor: string | null;
}

export const reportsService = {
  async flagIfSuspicious(
    sourceType: ReportSource,
    sourceId: string,
    authorId: string,
    text: string,
    store: ReportStore,
  ): Promise<LeakageReport | null> {
    const scan = scanText(text);
    if (!scan.flagged || !scan.excerpt) return null;

    const report: LeakageReport = {
      reportId: randomUUID(),
      sourceType,
      sourceId,
      authorId,
      findings: scan.findings,
      excerpt: scan.excerpt,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };

    try {
      return await store.create(report);
    } catch (error) {
      logger.warn("Suspicious content could not be flagged", {
        sourceType,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },

  async listReports(status: ReportStatus | undefined, limit: number, cursor: string | undefined, store: ReportStore): Promise<ReportPage> {
    const result = await store.listByStatus(status, limit, decodePageCursor(cursor));
    return { items: result.items, nextCursor: encodePageCursor(result.lastKey) };
  },

  async resolveReport(reportId: string, status: ReportStatus, store: ReportStore): Promise<LeakageReport> {
    const report = await store.getById(reportId);
    if (!report) {
      throw AppError.notFound("Report not found");
    }
    return store.setStatus(reportId, status);
  },
};
