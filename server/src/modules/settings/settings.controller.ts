import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { settingsRepository } from "./settings.repository";
import type { UpdateSettingsInput } from "./settings.schemas";
import { settingsService } from "./settings.service";

export const settingsController = {
  getPublic: asyncHandler(async (_req: Request, res: Response) => {
    const settings = await settingsService.getPublicSettings(settingsRepository);
    res.status(200).json({ data: { settings } });
  }),

  getPlatform: asyncHandler(async (_req: Request, res: Response) => {
    const settings = await settingsService.getPlatformSettings(settingsRepository);
    res.status(200).json({ data: { settings } });
  }),

  updatePlatform: asyncHandler(async (req: Request, res: Response) => {
    const settings = await settingsService.updatePlatformSettings(req.body as UpdateSettingsInput, settingsRepository);
    res.status(200).json({ data: { settings } });
  }),
};
