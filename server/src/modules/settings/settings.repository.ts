import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../aws/clients";
import { env } from "../../config/env";
import { DEFAULT_SETTINGS, type PlatformSettings } from "./settings.types";

const PLATFORM_KEY = "platform";

export const settingsRepository = {
  async getPlatform(): Promise<PlatformSettings> {
    const result = await ddb.send(
      new GetCommand({
        TableName: env.DYNAMODB_SETTINGS_TABLE,
        Key: { settingKey: PLATFORM_KEY },
      }),
    );

    const item = result.Item as PlatformSettings | undefined;
    if (item) return item;

    const timestamp = new Date().toISOString();
    const defaults: PlatformSettings = { settingKey: PLATFORM_KEY, ...DEFAULT_SETTINGS, updatedAt: timestamp };
    await ddb.send(
      new PutCommand({
        TableName: env.DYNAMODB_SETTINGS_TABLE,
        Item: defaults,
        ConditionExpression: "attribute_not_exists(settingKey)",
      }),
    );
    return defaults;
  },

  async updatePlatform(patch: { buyerCommissionPercent?: number; sellerCommissionPercent?: number }): Promise<PlatformSettings> {
    const names: Record<string, string> = { "#updatedAt": "updatedAt" };
    const values: Record<string, unknown> = { ":updatedAt": new Date().toISOString() };
    const assignments = ["#updatedAt = :updatedAt"];

    if (patch.buyerCommissionPercent !== undefined) {
      names["#buyer"] = "buyerCommissionPercent";
      values[":buyer"] = patch.buyerCommissionPercent;
      assignments.push("#buyer = :buyer");
    }
    if (patch.sellerCommissionPercent !== undefined) {
      names["#seller"] = "sellerCommissionPercent";
      values[":seller"] = patch.sellerCommissionPercent;
      assignments.push("#seller = :seller");
    }

    const result = await ddb.send(
      new UpdateCommand({
        TableName: env.DYNAMODB_SETTINGS_TABLE,
        Key: { settingKey: PLATFORM_KEY },
        UpdateExpression: `SET ${assignments.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes as PlatformSettings;
  },
};
