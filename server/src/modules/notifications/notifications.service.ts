import { randomUUID } from "node:crypto";
import type { SnsPort } from "../../aws/sns";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { decodePageCursor, encodePageCursor } from "../availability/availability.pagination";
import type { notificationsRepository } from "./notifications.repository";
import type { ListNotificationsQuery } from "./notifications.schemas";
import type { NotificationItem, NotificationType } from "./notifications.types";

export type NotificationStore = Pick<typeof notificationsRepository, "create" | "getById" | "listByUser" | "countUnread" | "markRead">;

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
}

export interface NotificationPage {
  items: NotificationItem[];
  nextCursor: string | null;
}

export const notificationsService = {
  async notify(
    input: NotifyInput,
    store: NotificationStore,
    sns: SnsPort,
    topicArn: string | undefined,
  ): Promise<NotificationItem | null> {
    const item: NotificationItem = {
      notificationId: randomUUID(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      read: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await store.create(item);
    } catch (error) {
      logger.warn("Notification row could not be stored", {
        type: input.type,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }

    if (topicArn) {
      try {
        await sns.publish({
          topicArn,
          subject: `[OpenHR] ${input.title}`,
          message: `${input.title}\n\n${input.body}`,
          eventType: input.type,
        });
      } catch (error) {
        logger.warn("SNS publish failed", {
          type: input.type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return item;
  },

  async listMine(userId: string, query: ListNotificationsQuery, store: NotificationStore): Promise<NotificationPage> {
    const result = await store.listByUser(userId, query.unreadOnly, query.limit, decodePageCursor(query.cursor));
    return { items: result.items, nextCursor: encodePageCursor(result.lastKey) };
  },

  async unreadCount(userId: string, store: NotificationStore): Promise<{ count: number; hasMore: boolean }> {
    return store.countUnread(userId);
  },

  async markRead(userId: string, notificationId: string, store: NotificationStore): Promise<NotificationItem> {
    const item = await store.getById(notificationId);
    if (!item || item.userId !== userId) {
      throw AppError.notFound("Notification not found");
    }
    if (item.read) return item;
    try {
      return await store.markRead(notificationId, userId);
    } catch (error) {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
        throw AppError.notFound("Notification not found");
      }
      throw error;
    }
  },

  async markAllRead(userId: string, store: NotificationStore): Promise<{ marked: number }> {
    const result = await store.listByUser(userId, true, 50, undefined);
    let marked = 0;
    await Promise.all(
      result.items.map(async (item) => {
        try {
          await store.markRead(item.notificationId, userId);
          marked += 1;
        } catch (error) {
          logger.warn("Notification could not be marked read", {
            notificationId: item.notificationId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );
    return { marked };
  },
};
