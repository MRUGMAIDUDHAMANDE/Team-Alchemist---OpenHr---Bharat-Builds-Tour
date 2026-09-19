import { GetCommand, QueryCommand, ScanCommand, UpdateCommand, type QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../aws/clients";
import { env } from "../../config/env";
import type { Booking, BookingStatus } from "./bookings.types";

export const BOOKING_AVAILABILITY_INDEX = "availability-index";
export const BOOKING_PUBLISHER_INDEX = "publisher-index";
export const BOOKING_SEEKER_INDEX = "seeker-index";

export interface BookingListResult {
  items: Booking[];
  lastKey?: Record<string, unknown>;
}

async function queryByOwner(
  indexName: string,
  keyName: string,
  keyValue: string,
  limit: number,
  exclusiveStartKey?: Record<string, unknown>,
): Promise<BookingListResult> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: env.DYNAMODB_BOOKINGS_TABLE,
      IndexName: indexName,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: { "#pk": keyName },
      ExpressionAttributeValues: { ":pk": keyValue },
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey as QueryCommandInput["ExclusiveStartKey"],
    }),
  );

  return {
    items: (result.Items as Booking[] | undefined) ?? [],
    lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
  };
}

export const bookingsRepository = {
  async getById(bookingId: string): Promise<Booking | null> {
    const result = await ddb.send(
      new GetCommand({
        TableName: env.DYNAMODB_BOOKINGS_TABLE,
        Key: { bookingId },
      }),
    );
    return (result.Item as Booking | undefined) ?? null;
  },

  async getByAvailabilityId(availabilityId: string): Promise<Booking[]> {
    const result = await ddb.send(
      new QueryCommand({
        TableName: env.DYNAMODB_BOOKINGS_TABLE,
        IndexName: BOOKING_AVAILABILITY_INDEX,
        KeyConditionExpression: "availabilityId = :availabilityId",
        ExpressionAttributeValues: { ":availabilityId": availabilityId },
      }),
    );
    return (result.Items as Booking[] | undefined) ?? [];
  },

  async listByPublisher(publisherId: string, limit: number, exclusiveStartKey?: Record<string, unknown>): Promise<BookingListResult> {
    return queryByOwner(BOOKING_PUBLISHER_INDEX, "publisherId", publisherId, limit, exclusiveStartKey);
  },

  async listBySeeker(seekerId: string, limit: number, exclusiveStartKey?: Record<string, unknown>): Promise<BookingListResult> {
    return queryByOwner(BOOKING_SEEKER_INDEX, "seekerId", seekerId, limit, exclusiveStartKey);
  },

  async listAll(limit: number): Promise<Booking[]> {
    const result = await ddb.send(
      new ScanCommand({ TableName: env.DYNAMODB_BOOKINGS_TABLE, Limit: limit }),
    );
    return (result.Items as Booking[] | undefined) ?? [];
  },

  async transitionBooking(bookingId: string, from: BookingStatus[], to: BookingStatus, extra?: { cancelReason?: string }): Promise<Booking> {
    const names: Record<string, string> = { "#status": "status" };
    const values: Record<string, unknown> = { ":to": to, ":now": new Date().toISOString() };
    const assignments = ["#status = :to", "updatedAt = :now"];

    if (extra?.cancelReason !== undefined) {
      names["#cancelReason"] = "cancelReason";
      values[":cancelReason"] = extra.cancelReason;
      assignments.push("#cancelReason = :cancelReason");
    }

    from.forEach((status, index) => {
      values[`:from${index}`] = status;
    });

    const result = await ddb.send(
      new UpdateCommand({
        TableName: env.DYNAMODB_BOOKINGS_TABLE,
        Key: { bookingId },
        UpdateExpression: `SET ${assignments.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: `attribute_exists(bookingId) AND #status IN (${from.map((_, index) => `:from${index}`).join(", ")})`,
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes as Booking;
  },
};
