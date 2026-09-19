import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { notificationsController } from "./notifications.controller";
import { listNotificationsQuerySchema, notificationIdParamsSchema } from "./notifications.schemas";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);
notificationsRouter.get("/mine", validate(listNotificationsQuerySchema, "query"), notificationsController.listMine);
notificationsRouter.get("/unread-count", notificationsController.unreadCount);
notificationsRouter.post("/read-all", notificationsController.markAllRead);
notificationsRouter.post("/:notificationId/read", validate(notificationIdParamsSchema, "params"), notificationsController.markRead);
