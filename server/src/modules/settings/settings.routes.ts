import { Router } from "express";
import { authenticate, requireGroup } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { settingsController } from "./settings.controller";
import { updateSettingsSchema } from "./settings.schemas";

export const settingsRouter = Router();

settingsRouter.get("/public", settingsController.getPublic);
settingsRouter.get("/", authenticate, requireGroup("ADMIN"), settingsController.getPlatform);
settingsRouter.put("/", authenticate, requireGroup("ADMIN"), validate(updateSettingsSchema), settingsController.updatePlatform);
