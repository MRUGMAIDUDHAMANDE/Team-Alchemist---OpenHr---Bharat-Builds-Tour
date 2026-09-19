import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { AppError } from "../../lib/errors";
import { notificationsRepository } from "./notifications.repository";
import type { ListNotificationsQuery } from "./notifications.schemas";
import { notificationsService } from "./notifications.service";

function authenticatedUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw AppError.unauthorized();
  }
  return userId;
}

export const notificationsController = {
  listMine: asyncHandler(async (req: Request, res: Response) => {
    const page = await notificationsService.listMine(
      authenticatedUserId(req),
      req.query as unknown as ListNotificationsQuery,
      notificationsRepository,
    );
    res.status(200).json({ data: page });
  }),

  unreadCount: asyncHandler(async (req: Request, res: Response) => {
    const result = await notificationsService.unreadCount(authenticatedUserId(req), notificationsRepository);
    res.status(200).json({ data: result });
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { notificationId: string };
    const item = await notificationsService.markRead(authenticatedUserId(req), params.notificationId, notificationsRepository);
    res.status(200).json({ data: { notification: item } });
  }),

  markAllRead: asyncHandler(async (req: Request, res: Response) => {
    const result = await notificationsService.markAllRead(authenticatedUserId(req), notificationsRepository);
    res.status(200).json({ data: result });
  }),
};
