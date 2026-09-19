import { GetCommand, QueryCommand, TransactWriteCommand, type QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../aws/clients";
import { env } from "../../config/env";
import type { Review } from "./reviews.types";

export const REVIEW_REVIEWEE_INDEX = "reviewee-index";
export const REVIEW_BOOKING_INDEX = "booking-index";

export interface ReviewListResult {
  items: Review[];
  lastKey?: Record<string, unknown>;
}

export interface RatingUpdate {
  revieweeId: string;
  expectedCount: number;
  newAverage: number;
  newCount: number;
  newSum: number;
  timestamp: string;
}

async function queryReviews(
  indexName: string,
  keyName: string,
  keyValue: string,
  limit: number,
  exclusiveStartKey?: Record<string, unknown>,
): Promise<ReviewListResult> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: env.DYNAMODB_REVIEWS_TABLE,
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
    items: (result.Items as Review[] | undefined) ?? [],
    lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
  };
}

export const reviewsRepository = {
  async getById(reviewId: string): Promise<Review | null> {
    const result = await ddb.send(
      new GetCommand({
        TableName: env.DYNAMODB_REVIEWS_TABLE,
        Key: { reviewId },
      }),
    );
    return (result.Item as Review | undefined) ?? null;
  },

  async listByReviewee(revieweeId: string, limit: number, exclusiveStartKey?: Record<string, unknown>): Promise<ReviewListResult> {
    return queryReviews(REVIEW_REVIEWEE_INDEX, "revieweeId", revieweeId, limit, exclusiveStartKey);
  },

  async listByBooking(bookingId: string): Promise<Review[]> {
    const result = await ddb.send(
      new QueryCommand({
        TableName: env.DYNAMODB_REVIEWS_TABLE,
        IndexName: REVIEW_BOOKING_INDEX,
        KeyConditionExpression: "bookingId = :bookingId",
        ExpressionAttributeValues: { ":bookingId": bookingId },
      }),
    );
    return (result.Items as Review[] | undefined) ?? [];
  },

  async createWithRating(review: Review, rating: RatingUpdate): Promise<void> {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: env.DYNAMODB_REVIEWS_TABLE,
              Item: review,
              ConditionExpression: "attribute_not_exists(reviewId)",
            },
          },
          {
            Update: {
              TableName: env.DYNAMODB_USERS_TABLE,
              Key: { userId: rating.revieweeId },
              UpdateExpression: "SET ratingAverage = :average, ratingCount = :count, ratingSum = :sum, updatedAt = :now",
              ExpressionAttributeValues: {
                ":average": rating.newAverage,
                ":count": rating.newCount,
                ":sum": rating.newSum,
                ":now": rating.timestamp,
                ":expectedCount": rating.expectedCount,
              },
              ConditionExpression: "attribute_exists(userId) AND ratingCount = :expectedCount",
            },
          },
        ],
      }),
    );
  },
};
