import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { AppError } from "../../lib/errors";
import { usersRepository } from "./users.repository";
import type { UpdateProfileInput } from "./users.schemas";
import { usersService } from "./users.service";

function authenticatedUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw AppError.unauthorized();
  }
  return userId;
}

export const usersController = {
  getMe: asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.getOwnProfile(authenticatedUserId(req), usersRepository);
    res.status(200).json({ data: { user } });
  }),

  updateMe: asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.updateOwnProfile(
      authenticatedUserId(req),
      req.body as UpdateProfileInput,
      usersRepository,
    );
    res.status(200).json({ data: { user } });
  }),

  getPublic: asyncHandler(async (req: Request, res: Response) => {
    authenticatedUserId(req);
    const params = req.params as { userId: string };
    const user = await usersService.getPublicProfile(params.userId, usersRepository);
    res.status(200).json({ data: { user } });
  }),
};
