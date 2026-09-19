import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { AppError } from "../../lib/errors";
import { storage } from "../../aws/storage";
import { usersRepository } from "../users/users.repository";
import { mediaRepository } from "./media.repository";
import type { ConfirmUploadInput, ListMediaQuery, UploadUrlInput, ViewUrlQuery } from "./media.schemas";
import { mediaService } from "./media.service";

function authenticatedUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw AppError.unauthorized();
  }
  return userId;
}

export const mediaController = {
  createUploadUrl: asyncHandler(async (req: Request, res: Response) => {
    const result = await mediaService.createUploadUrl(authenticatedUserId(req), req.body as UploadUrlInput, storage);
    res.status(201).json({ data: result });
  }),

  confirmUpload: asyncHandler(async (req: Request, res: Response) => {
    const item = await mediaService.confirmUpload(
      authenticatedUserId(req),
      req.body as ConfirmUploadInput,
      storage,
      mediaRepository,
      usersRepository,
    );
    res.status(201).json({ data: { media: item } });
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const page = await mediaService.listMine(
      authenticatedUserId(req),
      req.query as unknown as ListMediaQuery,
      mediaRepository,
    );
    res.status(200).json({ data: page });
  }),

  viewByKey: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ViewUrlQuery;
    const result = await mediaService.createViewUrlByKey(authenticatedUserId(req), query.key, storage);
    res.status(200).json({ data: result });
  }),

  createViewUrl: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { mediaId: string };
    const result = await mediaService.createViewUrl(authenticatedUserId(req), params.mediaId, storage, mediaRepository);
    res.status(200).json({ data: result });
  }),
};
