import { PublishCommand } from "@aws-sdk/client-sns";
import { snsClient } from "./clients";

export interface SnsPublishInput {
  topicArn: string;
  subject: string;
  message: string;
  eventType: string;
}

export interface SnsPort {
  publish(input: SnsPublishInput): Promise<void>;
}

export const sns: SnsPort = {
  async publish(input: SnsPublishInput): Promise<void> {
    await snsClient.send(
      new PublishCommand({
        TopicArn: input.topicArn,
        Subject: input.subject,
        Message: input.message,
        MessageAttributes: {
          eventType: { DataType: "String", StringValue: input.eventType },
        },
      }),
    );
  },
};
