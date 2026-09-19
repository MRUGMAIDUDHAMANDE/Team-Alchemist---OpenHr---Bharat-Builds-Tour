import { GetCommand, PutCommand, QueryCommand, UpdateCommand, type QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../aws/clients";
import { env } from "../../config/env";
import type { NotificationItem } from "./notifications.types";

export const NOTIFICATION_USER_INDEX = "user-index";

export interface NotificationListResult {
  items: NotificationItem[];
  lastKey?: Record<string, unknown>;
}

export const notificationsRepository = {
  async create(item: NotificationItem): Promise<NotificationItem> {
    await ddb.send(
      new PutCommand({
        TableName: env.DYNAMODB_NOTIFICATIONS_TABLE,
        Item: item,
        ConditionExpression: "attribute_not_exists(notificationId)",
      }),
    );
    return item;
  },

  async getById(notificationId: string): Promise<NotificationItem | null> {
    const result = await ddb.send(
      new GetCommand({
        TableName: env.DYNAMODB_NOTIFICATIONS_TABLE,
        Key: { notificationId },
      }),
    );
    return (result.Item as NotificationItem | undefined) ?? null;
  },

  async listByUser(userId: string, unreadOnly: boolean | undefined, limit: number, exclusiveStartKey?: Record<string, unknown>): Promise<NotificationListResult> {
    const names: Record<string, string> = { "#userId": "userId" };
    const values: Record<string, unknown> = { ":userId": userId };
    const filters: string[] = [];

    if (unreadOnly) {
      names["#read"] = "read";
      values[":read"] = false;
      filters.push("#read = :read");
    }

    const result = await ddb.send(
      new QueryCommand({
        TableName: env.DYNAMODB_NOTIFICATIONS_TABLE,
        IndexName: NOTIFICATION_USER_INDEX,
        KeyConditionExpression: "#userId = :userId",
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ...(filters.length > 0 ? { FilterExpression: filters.join(" AND ") } : {}),
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey as QueryCommandInput["ExclusiveStartKey"],
      }),
    );

    return {
      items: (result.Items as NotificationItem[] | undefined) ?? [],
      lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
    };
  },

  async countUnread(userId: string): Promise<{ count: number; hasMore: boolean }> {
    const result = await ddb.send(
      new QueryCommand({
        TableName: env.DYNAMODB_NOTIFICATIONS_TABLE,
        IndexName: NOTIFICATION_USER_INDEX,
        KeyConditionExpression: "#userId = :userId",
        FilterExpression: "#read = :read",
        ExpressionAttributeNames: { "#userId": "userId", "#read": "read" },
        ExpressionAttributeValues: { ":userId": userId, ":read": false },
        Select: "COUNT",
        Limit: 101,
      }),
    );
    const count = result.Count ?? 0;
    return { count: Math.min(count, 100), hasMore: count > 100 };
  },

  async markRead(notificationId: string, userId: string): Promise<NotificationItem> {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: env.DYNAMODB_NOTIFICATIONS_TABLE,
        Key: { notificationId },
        UpdateExpression: "SET #read = :read",
        ExpressionAttributeNames: { "#read": "read" },
        ExpressionAttributeValues: { ":read": true, ":userId": userId },
        ConditionExpression: "attribute_exists(notificationId) AND userId = :userId",
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes as NotificationItem;
  },
};
