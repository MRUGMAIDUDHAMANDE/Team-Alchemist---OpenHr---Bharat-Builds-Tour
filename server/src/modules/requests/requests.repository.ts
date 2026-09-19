import { GetCommand, PutCommand, QueryCommand, TransactWriteCommand, UpdateCommand, type QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../aws/clients";
import { env } from "../../config/env";
import type { Booking } from "../bookings/bookings.types";
import type { BookingRequest, RequestStatus } from "./requests.types";

export const REQUEST_AVAILABILITY_INDEX = "availability-index";
export const REQUEST_SEEKER_INDEX = "seeker-index";
export const REQUEST_PUBLISHER_INDEX = "publisher-index";

export interface RequestListResult {
  items: BookingRequest[];
  lastKey?: Record<string, unknown>;
}

export interface AcceptAtomicInput {
  availabilityId: string;
  requestId: string;
  booking: Booking;
  otherPendingRequestIds: string[];
  timestamp: string;
}

async function queryByOwner(
  indexName: string,
  keyName: string,
  keyValue: string,
  status: RequestStatus | undefined,
  limit: number,
  exclusiveStartKey?: Record<string, unknown>,
): Promise<RequestListResult> {
  const names: Record<string, string> = { "#pk": keyName };
  const values: Record<string, unknown> = { ":pk": keyValue };
  const filters: string[] = [];

  if (status) {
    names["#status"] = "status";
    values[":status"] = status;
    filters.push("#status = :status");
  }

  const result = await ddb.send(
    new QueryCommand({
      TableName: env.DYNAMODB_REQUESTS_TABLE,
      IndexName: indexName,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ...(filters.length > 0 ? { FilterExpression: filters.join(" AND ") } : {}),
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey as QueryCommandInput["ExclusiveStartKey"],
    }),
  );

  return {
    items: (result.Items as BookingRequest[] | undefined) ?? [],
    lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
  };
}

export const requestsRepository = {
  async create(request: BookingRequest): Promise<BookingRequest> {
    await ddb.send(
      new PutCommand({
        TableName: env.DYNAMODB_REQUESTS_TABLE,
        Item: request,
        ConditionExpression: "attribute_not_exists(requestId)",
      }),
    );
    return request;
  },

  async getById(requestId: string): Promise<BookingRequest | null> {
    const result = await ddb.send(
      new GetCommand({
        TableName: env.DYNAMODB_REQUESTS_TABLE,
        Key: { requestId },
      }),
    );
    return (result.Item as BookingRequest | undefined) ?? null;
  },

  async listByAvailability(availabilityId: string): Promise<BookingRequest[]> {
    const result = await ddb.send(
      new QueryCommand({
        TableName: env.DYNAMODB_REQUESTS_TABLE,
        IndexName: REQUEST_AVAILABILITY_INDEX,
        KeyConditionExpression: "availabilityId = :availabilityId",
        ExpressionAttributeValues: { ":availabilityId": availabilityId },
      }),
    );
    return (result.Items as BookingRequest[] | undefined) ?? [];
  },

  async listBySeeker(seekerId: string, status: RequestStatus | undefined, limit: number, exclusiveStartKey?: Record<string, unknown>): Promise<RequestListResult> {
    return queryByOwner(REQUEST_SEEKER_INDEX, "seekerId", seekerId, status, limit, exclusiveStartKey);
  },

  async listByPublisher(publisherId: string, status: RequestStatus | undefined, limit: number, exclusiveStartKey?: Record<string, unknown>): Promise<RequestListResult> {
    return queryByOwner(REQUEST_PUBLISHER_INDEX, "publisherId", publisherId, status, limit, exclusiveStartKey);
  },

  async transitionStatus(requestId: string, ownerField: "publisherId" | "seekerId", ownerId: string, to: RequestStatus): Promise<BookingRequest> {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: env.DYNAMODB_REQUESTS_TABLE,
        Key: { requestId },
        UpdateExpression: "SET #status = :to, updatedAt = :now",
        ExpressionAttributeNames: { "#status": "status", "#owner": ownerField },
        ExpressionAttributeValues: { ":to": to, ":now": new Date().toISOString(), ":ownerId": ownerId, ":pending": "PENDING" },
        ConditionExpression: "attribute_exists(requestId) AND #owner = :ownerId AND #status = :pending",
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes as BookingRequest;
  },

  async acceptAtomic(input: AcceptAtomicInput): Promise<void> {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: env.DYNAMODB_AVAILABILITY_TABLE,
              Key: { availabilityId: input.availabilityId },
              UpdateExpression: "SET #status = :booked, updatedAt = :now",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: { ":booked": "BOOKED", ":now": input.timestamp, ":available": "AVAILABLE" },
              ConditionExpression: "#status = :available",
            },
          },
          {
            Update: {
              TableName: env.DYNAMODB_REQUESTS_TABLE,
              Key: { requestId: input.requestId },
              UpdateExpression: "SET #status = :accepted, updatedAt = :now",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: { ":accepted": "ACCEPTED", ":now": input.timestamp, ":pending": "PENDING" },
              ConditionExpression: "#status = :pending",
            },
          },
          {
            Put: {
              TableName: env.DYNAMODB_BOOKINGS_TABLE,
              Item: input.booking,
              ConditionExpression: "attribute_not_exists(bookingId)",
            },
          },
          ...input.otherPendingRequestIds.map((requestId) => ({
            Update: {
              TableName: env.DYNAMODB_REQUESTS_TABLE,
              Key: { requestId },
              UpdateExpression: "SET #status = :expired, updatedAt = :now",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: { ":expired": "EXPIRED", ":now": input.timestamp, ":pending": "PENDING" },
              ConditionExpression: "#status = :pending",
            },
          })),
        ],
      }),
    );
  },
};
