import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SnsPort } from "../src/aws/sns";
import { isAppError } from "../src/lib/errors";
import { notificationsService, type NotificationStore, type NotifyInput } from "../src/modules/notifications/notifications.service";
import { listNotificationsQuerySchema } from "../src/modules/notifications/notifications.schemas";
import type { NotificationItem } from "../src/modules/notifications/notifications.types";

function item(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    notificationId: "notif-1",
    userId: "user-1",
    type: "REQUEST_CREATED",
    title: "New booking request",
    body: "Seeker One requested Python.",
    link: "/requests",
    read: false,
    createdAt: "2026-09-19T00:00:00.000Z",
    ...overrides,
  };
}

function createStore(saved: NotificationItem[] = [item()]) {
  const created: NotificationItem[] = [];
  const marked: string[] = [];
  const store: NotificationStore = {
    async create(value: NotificationItem) {
      created.push(value);
      return value;
    },
    async getById(notificationId: string) {
      return saved.find((entry) => entry.notificationId === notificationId) ?? null;
    },
    async listByUser() {
      return { items: saved };
    },
    async countUnread() {
      return { count: saved.filter((entry) => !entry.read).length, hasMore: false };
    },
    async markRead(notificationId: string) {
      marked.push(notificationId);
      const current = saved.find((entry) => entry.notificationId === notificationId);
      assert.ok(current);
      return { ...current, read: true };
    },
  };
  return { store, created, marked };
}

function createSns(fail = false) {
  const published: Array<unknown> = [];
  const sns: SnsPort = {
    async publish(input: unknown) {
      published.push(input);
      if (fail) throw new Error("SNS is down");
    },
  };
  return { sns, published };
}

const notifyInput: NotifyInput = {
  userId: "user-1",
  type: "REQUEST_CREATED",
  title: "New booking request",
  body: "Seeker One requested Python.",
  link: "/requests",
};

describe("notificationsService.notify", () => {
  it("stores the row and publishes to SNS", async () => {
    const { store, created } = createStore([]);
    const { sns, published } = createSns();
    const result = await notificationsService.notify(notifyInput, store, sns, "arn:topic");

    assert.ok(result);
    assert.equal(created.length, 1);
    assert.equal(published.length, 1);
    assert.deepEqual((published[0] as { eventType: string }).eventType, "REQUEST_CREATED");
  });

  it("skips SNS when no topic is configured", async () => {
    const { store, created } = createStore([]);
    const { sns, published } = createSns();
    const result = await notificationsService.notify(notifyInput, store, sns, undefined);

    assert.ok(result);
    assert.equal(created.length, 1);
    assert.equal(published.length, 0);
  });

  it("survives SNS outages without failing the request", async () => {
    const { store } = createStore([]);
    const { sns, published } = createSns(true);
    const result = await notificationsService.notify(notifyInput, store, sns, "arn:topic");

    assert.ok(result);
    assert.equal(published.length, 1);
  });

  it("returns null when the row cannot be stored", async () => {
    const store: NotificationStore = {
      async create() {
        throw new Error("DynamoDB is down");
      },
      async getById() {
        return null;
      },
      async listByUser() {
        return { items: [] };
      },
      async countUnread() {
        return { count: 0, hasMore: false };
      },
      async markRead() {
        throw new Error("unreachable");
      },
    };
    const { sns, published } = createSns();
    const result = await notificationsService.notify(notifyInput, store, sns, "arn:topic");

    assert.equal(result, null);
    assert.equal(published.length, 0);
  });
});

describe("notificationsService.markRead", () => {
  it("marks only the owner's notification", async () => {
    const { store, marked } = createStore();
    const result = await notificationsService.markRead("user-1", "notif-1", store);
    assert.equal(result.read, true);
    assert.deepEqual(marked, ["notif-1"]);
  });

  it("hides other users' notifications", async () => {
    const { store } = createStore();
    await assert.rejects(
      notificationsService.markRead("user-2", "notif-1", store),
      (error: unknown) => isAppError(error) && error.status === 404,
    );
  });
});

describe("notificationsService.markAllRead", () => {
  it("marks every unread notification", async () => {
    const { store, marked } = createStore([item(), item({ notificationId: "notif-2" })]);
    const result = await notificationsService.markAllRead("user-1", store);
    assert.equal(result.marked, 2);
    assert.deepEqual(marked, ["notif-1", "notif-2"]);
  });
});

describe("listNotificationsQuerySchema", () => {
  it("parses the unread flag and defaults the limit", () => {
    const parsed = listNotificationsQuerySchema.parse({ unreadOnly: "true" });
    assert.equal(parsed.unreadOnly, true);
    assert.equal(parsed.limit, 20);
  });
});
