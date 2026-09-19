import { GetCommand, PutCommand, QueryCommand, UpdateCommand, type QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../aws/clients";
import { env } from "../../config/env";
import type { AvailabilitySlot, AvailabilityStatus } from "./availability.types";

export const PUBLISHER_TIME_INDEX = "publisher-time-index";
export const STATUS_TIME_INDEX = "status-time-index";

export interface AvailabilityListFilter {
  status?: AvailabilityStatus;
  from?: string;
  to?: string;
  limit: number;
  exclusiveStartKey?: Record<string, unknown>;
}

export interface AvailabilityListResult {
  items: AvailabilitySlot[];
  lastKey?: Record<string, unknown>;
}

export interface AvailabilityUpdate {
  patch: Partial<AvailabilitySlot> & { updatedAt: string };
  expectedStatus: AvailabilityStatus;
}

export const availabilityRepository = {
  async create(slot: AvailabilitySlot): Promise<AvailabilitySlot> {
    await ddb.send(
      new PutCommand({
        TableName: env.DYNAMODB_AVAILABILITY_TABLE,
        Item: slot,
        ConditionExpression: "attribute_not_exists(availabilityId)",
      }),
    );
    return slot;
  },

  async getById(availabilityId: string): Promise<AvailabilitySlot | null> {
    const result = await ddb.send(
      new GetCommand({
        TableName: env.DYNAMODB_AVAILABILITY_TABLE,
        Key: { availabilityId },
      }),
    );
    return (result.Item as AvailabilitySlot | undefined) ?? null;
  },

  async listByPublisher(publisherId: string, filter: AvailabilityListFilter): Promise<AvailabilityListResult> {
    const names: Record<string, string> = { "#publisherId": "publisherId" };
    const values: Record<string, unknown> = { ":publisherId": publisherId };
    const keyConditions = ["#publisherId = :publisherId"];

    if (filter.from && filter.to) {
      names["#startTime"] = "startTime";
      values[":from"] = filter.from;
      values[":to"] = filter.to;
      keyConditions.push("#startTime BETWEEN :from AND :to");
    } else if (filter.from) {
      names["#startTime"] = "startTime";
      values[":from"] = filter.from;
      keyConditions.push("#startTime >= :from");
    } else if (filter.to) {
      names["#startTime"] = "startTime";
      values[":to"] = filter.to;
      keyConditions.push("#startTime <= :to");
    }

    const filters: string[] = [];
    if (filter.status) {
      names["#status"] = "status";
      values[":status"] = filter.status;
      filters.push("#status = :status");
    }

    const result = await ddb.send(
      new QueryCommand({
        TableName: env.DYNAMODB_AVAILABILITY_TABLE,
        IndexName: PUBLISHER_TIME_INDEX,
        KeyConditionExpression: keyConditions.join(" AND "),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ...(filters.length > 0 ? { FilterExpression: filters.join(" AND ") } : {}),
        Limit: filter.limit,
        ScanIndexForward: true,
        ExclusiveStartKey: filter.exclusiveStartKey as QueryCommandInput["ExclusiveStartKey"],
      }),
    );

    return {
      items: (result.Items as AvailabilitySlot[] | undefined) ?? [],
      lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
    };
  },

  async updateOwned(availabilityId: string, publisherId: string, update: AvailabilityUpdate): Promise<AvailabilitySlot> {
    const entries = Object.entries(update.patch).filter(([, value]) => value !== undefined);
    const names: Record<string, string> = { "#status": "status" };
    const values: Record<string, unknown> = {
      ":publisherId": publisherId,
      ":expectedStatus": update.expectedStatus,
    };
    const assignments = entries.map(([key, value], index) => {
      names[`#f${index}`] = key;
      values[`:v${index}`] = value;
      return `#f${index} = :v${index}`;
    });

    const result = await ddb.send(
      new UpdateCommand({
        TableName: env.DYNAMODB_AVAILABILITY_TABLE,
        Key: { availabilityId },
        UpdateExpression: `SET ${assignments.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: "attribute_exists(availabilityId) AND publisherId = :publisherId AND #status = :expectedStatus",
        ReturnValues: "ALL_NEW",
      }),
    );

    return result.Attributes as AvailabilitySlot;
  },
};
