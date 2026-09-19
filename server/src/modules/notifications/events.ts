import { sns } from "../../aws/sns";
import { env } from "../../config/env";
import { notificationsRepository } from "./notifications.repository";
import { notificationsService, type NotifyInput } from "./notifications.service";

export function emitNotification(input: NotifyInput): Promise<unknown> {
  return notificationsService.notify(input, notificationsRepository, sns, env.SNS_TOPIC_ARN);
}
