import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeFees } from "../src/modules/settings/commission";
import { updateSettingsSchema } from "../src/modules/settings/settings.schemas";
import { DEFAULT_SETTINGS } from "../src/modules/settings/settings.types";
import { adminService, type AdminAvailabilityStore, type AdminBookingStore, type AdminContactStore, type AdminSettingsStore, type AdminUserStore } from "../src/modules/admin/admin.service";

describe("computeFees", () => {
  it("splits buyer and seller commission deterministically", () => {
    assert.deepEqual(computeFees(1400, 5, 10), {
      totalAmount: 1400,
      buyerCommissionPercent: 5,
      sellerCommissionPercent: 10,
      buyerFee: 70,
      buyerTotal: 1470,
      sellerFee: 140,
      sellerPayout: 1260,
      platformRevenue: 210,
    });
  });

  it("rounds fractional paise without losing money", () => {
    const fees = computeFees(333.33, 5, 10);
    assert.equal(fees.buyerFee, 16.67);
    assert.equal(fees.sellerFee, 33.33);
    assert.equal(fees.platformRevenue, 50);
    assert.equal(fees.sellerPayout, 300);
  });

  it("handles zero commission", () => {
    const fees = computeFees(100, 0, 0);
    assert.equal(fees.platformRevenue, 0);
    assert.equal(fees.sellerPayout, 100);
    assert.equal(fees.buyerTotal, 100);
  });
});

describe("DEFAULT_SETTINGS", () => {
  it("defines separate buyer and seller percentages", () => {
    assert.equal(DEFAULT_SETTINGS.buyerCommissionPercent, 5);
    assert.equal(DEFAULT_SETTINGS.sellerCommissionPercent, 10);
  });
});

describe("updateSettingsSchema", () => {
  it("rejects negative and oversized percentages", () => {
    assert.equal(updateSettingsSchema.safeParse({ buyerCommissionPercent: -1 }).success, false);
    assert.equal(updateSettingsSchema.safeParse({ sellerCommissionPercent: 51 }).success, false);
    assert.equal(updateSettingsSchema.safeParse({}).success, false);
    assert.equal(updateSettingsSchema.safeParse({ buyerCommissionPercent: 7.5 }).success, true);
  });
});

describe("adminService.getOverview", () => {
  const users: AdminUserStore = {
    async list() {
      return [
        { userId: "u1", status: "ACTIVE" },
        { userId: "u2", status: "ACTIVE" },
        { userId: "u3", status: "SUSPENDED" },
      ] as never;
    },
    async getById() {
      return null;
    },
    async setStatus() {},
  };
  const availability: AdminAvailabilityStore = {
    async listAll() {
      return [
        { status: "AVAILABLE" },
        { status: "AVAILABLE" },
        { status: "BOOKED" },
        { status: "CANCELLED" },
      ] as never;
    },
  };
  const bookings: AdminBookingStore = {
    async listAll() {
      return [
        { status: "CONFIRMED", totalAmount: 1000 },
        { status: "COMPLETED", totalAmount: 500 },
        { status: "CANCELLED", totalAmount: 2000 },
      ] as never;
    },
  };
  const contact: AdminContactStore = {
    async list() {
      return [{ status: "NEW" }, { status: "RESOLVED" }] as never;
    },
    async getById() {
      return null;
    },
    async setStatus() {
      throw new Error("unreachable");
    },
  };
  const settings: AdminSettingsStore = {
    async getPlatform() {
      return { settingKey: "platform", buyerCommissionPercent: 5, sellerCommissionPercent: 10, updatedAt: "" };
    },
  };

  it("aggregates counts and excludes cancelled bookings from revenue", async () => {
    const overview = await adminService.getOverview(users, availability, bookings, contact, settings);
    assert.deepEqual(overview.users, { total: 3, active: 2, suspended: 1 });
    assert.deepEqual(overview.availability, { available: 2, booked: 1, cancelled: 1 });
    assert.deepEqual(overview.bookings, { confirmed: 1, inProgress: 0, completed: 1, cancelled: 1 });
    assert.equal(overview.platformRevenue, 225);
    assert.equal(overview.contactNew, 1);
  });
});
