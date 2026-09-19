import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../aws/clients";
import { env } from "../../config/env";
import type { ContactMessage } from "./contact.types";

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
};
