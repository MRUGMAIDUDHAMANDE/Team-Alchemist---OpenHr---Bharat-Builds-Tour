import { GetCommand, QueryCommand, type QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../aws/clients";
import { env } from "../../config/env";
import type { Booking } from "./bookings.types";

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
};
