import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { availabilityController } from "./availability.controller";
import {
  availabilityIdParamsSchema,
  createAvailabilitySchema,
  listMineQuerySchema,
  updateAvailabilitySchema,
} from "./availability.schemas";

export const availabilityRouter = Router();

availabilityRouter.use(authenticate);
availabilityRouter.post("/", validate(createAvailabilitySchema), availabilityController.create);
availabilityRouter.get("/mine", validate(listMineQuerySchema, "query"), availabilityController.listMine);
availabilityRouter.get("/mine/:availabilityId", validate(availabilityIdParamsSchema, "params"), availabilityController.getMine);
availabilityRouter.patch("/:availabilityId", validate(availabilityIdParamsSchema, "params"), validate(updateAvailabilitySchema), availabilityController.update);
availabilityRouter.post("/:availabilityId/cancel", validate(availabilityIdParamsSchema, "params"), availabilityController.cancel);
availabilityRouter.get("/:availabilityId", validate(availabilityIdParamsSchema, "params"), availabilityController.getPublic);
