import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { AppError } from "../../lib/errors";
import { availabilityRepository } from "./availability.repository";
import { usersRepository } from "../users/users.repository";
import type { CreateAvailabilityInput, ListMineQuery, UpdateAvailabilityInput } from "./availability.schemas";
import { availabilityService } from "./availability.service";

function authenticatedUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw AppError.unauthorized();
  }
  return userId;
}

export const availabilityController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const slot = await availabilityService.createAvailability(
      authenticatedUserId(req),
      req.body as CreateAvailabilityInput,
      availabilityRepository,
      usersRepository,
    );
    res.status(201).json({ data: { availability: slot } });
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const page = await availabilityService.listMine(
      authenticatedUserId(req),
      req.query as unknown as ListMineQuery,
      availabilityRepository,
    );
    res.status(200).json({ data: page });
  }),

  getMine: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { availabilityId: string };
    const slot = await availabilityService.getMine(authenticatedUserId(req), params.availabilityId, availabilityRepository);
    res.status(200).json({ data: { availability: slot } });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { availabilityId: string };
    const slot = await availabilityService.updateMine(
      authenticatedUserId(req),
      params.availabilityId,
      req.body as UpdateAvailabilityInput,
      availabilityRepository,
      usersRepository,
    );
    res.status(200).json({ data: { availability: slot } });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { availabilityId: string };
    const slot = await availabilityService.cancelMine(authenticatedUserId(req), params.availabilityId, availabilityRepository);
    res.status(200).json({ data: { availability: slot } });
  }),

  getPublic: asyncHandler(async (req: Request, res: Response) => {
    authenticatedUserId(req);
    const params = req.params as { availabilityId: string };
    const slot = await availabilityService.getPublic(params.availabilityId, availabilityRepository);
    res.status(200).json({ data: { availability: slot } });
  }),
};
