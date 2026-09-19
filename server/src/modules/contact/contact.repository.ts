import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../aws/clients";
import { env } from "../../config/env";
import type { ContactMessage, ContactStatus } from "./contact.types";

export const contactRepository = {
  async create(message: ContactMessage): Promise<ContactMessage> {
    await ddb.send(
      new PutCommand({
        TableName: env.DYNAMODB_CONTACT_TABLE,
        Item: message,
        ConditionExpression: "attribute_not_exists(messageId)",
      }),
    );
    return message;
  },

  async list(limit: number): Promise<ContactMessage[]> {
    const result = await ddb.send(
      new ScanCommand({ TableName: env.DYNAMODB_CONTACT_TABLE, Limit: limit }),
    );
    const items = (result.Items as ContactMessage[] | undefined) ?? [];
    return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async getById(messageId: string): Promise<ContactMessage | null> {
    const result = await ddb.send(
      new GetCommand({
        TableName: env.DYNAMODB_CONTACT_TABLE,
        Key: { messageId },
      }),
    );
    return (result.Item as ContactMessage | undefined) ?? null;
  },

  async setStatus(messageId: string, status: ContactStatus): Promise<ContactMessage> {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: env.DYNAMODB_CONTACT_TABLE,
        Key: { messageId },
        UpdateExpression: "SET #status = :status",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": status },
        ConditionExpression: "attribute_exists(messageId)",
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes as ContactMessage;
  },
};
