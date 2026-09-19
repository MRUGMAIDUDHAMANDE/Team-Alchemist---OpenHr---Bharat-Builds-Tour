import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scanText } from "../src/modules/leakage/scanner";
import { reportsService, type ReportStore } from "../src/modules/reports/reports.service";
import { isAppError } from "../src/lib/errors";
import type { LeakageReport } from "../src/modules/reports/reports.types";

function createStore(saved: LeakageReport[] = []) {
  const created: LeakageReport[] = [];
  const store: ReportStore = {
    async create(report: LeakageReport) {
      created.push(report);
      return report;
    },
    async getById(reportId: string) {
      return saved.find((report) => report.reportId === reportId) ?? null;
    },
    async listByStatus() {
      return { items: saved };
    },
    async setStatus(reportId: string, status: never) {
      const current = saved.find((report) => report.reportId === reportId);
      assert.ok(current);
      return { ...current, status };
    },
  };
  return { store, created };
}

describe("scanText", () => {
  it("passes clean messages untouched", () => {
    const scan = scanText("I need help debugging my Python API before Friday.");
    assert.equal(scan.flagged, false);
    assert.deepEqual(scan.findings, []);
    assert.equal(scan.excerpt, null);
  });

  it("flags phone numbers, emails, and UPI handles", () => {
    const scan = scanText("Call me on 98765 43210 or mail me at rahul@example.com, my UPI is rahul@okhdfc.");
    assert.equal(scan.flagged, true);
    const types = Object.fromEntries(scan.findings.map((finding) => [finding.type, finding.count]));
    assert.equal(types.PHONE, 1);
    assert.equal(types.EMAIL, 1);
    assert.equal(types.UPI_HANDLE, 1);
    assert.ok(scan.excerpt?.includes("[redacted-phone]"));
    assert.ok(scan.excerpt?.includes("[redacted-email]"));
    assert.ok(scan.excerpt?.includes("[redacted-upi]"));
    assert.ok(!scan.excerpt?.includes("98765"));
    assert.ok(!scan.excerpt?.includes("rahul@example.com"));
  });

  it("flags off-platform payment language", () => {
    const scan = scanText("Let's cancel this and I'll pay you directly over WhatsApp.");
    assert.equal(scan.flagged, true);
    const types = Object.fromEntries(scan.findings.map((finding) => [finding.type, finding.count]));
    assert.ok(types.OFF_PLATFORM_PHRASE >= 2);
  });

  it("does not flag ordinary numbers", () => {
    const scan = scanText("The error code is 404 and it happens after 3 tries, around 5pm.");
    assert.equal(scan.flagged, false);
  });
});

describe("reportsService.flagIfSuspicious", () => {
  it("creates a report for flagged content", async () => {
    const { store, created } = createStore();
    const report = await reportsService.flagIfSuspicious(
      "REQUEST_MESSAGE",
      "req-1",
      "seeker-1",
      "My number is 98111 22334.",
      store,
    );

    assert.ok(report);
    assert.equal(report?.sourceType, "REQUEST_MESSAGE");
    assert.equal(report?.status, "OPEN");
    assert.equal(created.length, 1);
  });

  it("returns null for clean content", async () => {
    const { store, created } = createStore();
    const report = await reportsService.flagIfSuspicious(
      "REVIEW_TEXT",
      "rv-1",
      "seeker-1",
      "Great work, very professional.",
      store,
    );

    assert.equal(report, null);
    assert.equal(created.length, 0);
  });
});

describe("reportsService.resolveReport", () => {
  it("updates the status of an existing report", async () => {
    const existing: LeakageReport = {
      reportId: "rep-1",
      sourceType: "REQUEST_MESSAGE",
      sourceId: "req-1",
      authorId: "seeker-1",
      findings: [{ type: "PHONE", count: 1 }],
      excerpt: "Call [redacted-phone].",
      status: "OPEN",
      createdAt: "2026-09-19T00:00:00.000Z",
    };
    const { store } = createStore([existing]);
    const result = await reportsService.resolveReport("rep-1", "DISMISSED", store);
    assert.equal(result.status, "DISMISSED");
  });

  it("returns not found for unknown reports", async () => {
    const { store } = createStore();
    await assert.rejects(
      reportsService.resolveReport("missing", "DISMISSED", store),
      (error: unknown) => isAppError(error) && error.status === 404,
    );
  });
});
