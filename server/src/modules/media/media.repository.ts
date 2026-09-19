import { GetCommand, PutCommand, QueryCommand, type QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../aws/clients";
import { env } from "../../config/env";
import type { MediaItem, MediaPurpose } from "./media.types";

export const MEDIA_OWNER_INDEX = "owner-index";

export interface MediaListResult {
  items: MediaItem[];
  lastKey?: Record<string, unknown>;
}

export const mediaRepository = {
  async create(item: MediaItem): Promise<MediaItem> {
    await ddb.send(
      new PutCommand({
        TableName: env.DYNAMODB_MEDIA_TABLE,
        Item: item,
        ConditionExpression: "attribute_not_exists(mediaId)",
      }),
    );
    return item;
  },

  async getById(mediaId: string): Promise<MediaItem | null> {
    const result = await ddb.send(
      new GetCommand({
        TableName: env.DYNAMODB_MEDIA_TABLE,
        Key: { mediaId },
      }),
    );
    return (result.Item as MediaItem | undefined) ?? null;
  },

  async listByOwner(ownerId: string, purpose: MediaPurpose | undefined, limit: number, exclusiveStartKey?: Record<string, unknown>): Promise<MediaListResult> {
    const names: Record<string, string> = { "#ownerId": "ownerId" };
    const values: Record<string, unknown> = { ":ownerId": ownerId };
    const filters: string[] = [];

    if (purpose) {
      names["#purpose"] = "purpose";
      values[":purpose"] = purpose;
      filters.push("#purpose = :purpose");
    }

    const result = await ddb.send(
      new QueryCommand({
        TableName: env.DYNAMODB_MEDIA_TABLE,
        IndexName: MEDIA_OWNER_INDEX,
        KeyConditionExpression: "#ownerId = :ownerId",
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ...(filters.length > 0 ? { FilterExpression: filters.join(" AND ") } : {}),
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey as QueryCommandInput["ExclusiveStartKey"],
      }),
    );

    return {
      items: (result.Items as MediaItem[] | undefined) ?? [],
      lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
    };
  },
};
