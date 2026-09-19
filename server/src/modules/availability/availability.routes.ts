import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { availabilityController } from "./availability.controller";
import {
  availabilityIdParamsSchema,
  createAvailabilitySchema,
  listMineQuerySchema,
  searchAvailabilityQuerySchema,
  updateAvailabilitySchema,
} from "./availability.schemas";

export const availabilityRouter = Router();

availabilityRouter.get("/search", validate(searchAvailabilityQuerySchema, "query"), availabilityController.search);
availabilityRouter.get("/mine", authenticate, validate(listMineQuerySchema, "query"), availabilityController.listMine);
availabilityRouter.get("/mine/:availabilityId", authenticate, validate(availabilityIdParamsSchema, "params"), availabilityController.getMine);
availabilityRouter.post("/", authenticate, validate(createAvailabilitySchema), availabilityController.create);
availabilityRouter.patch("/:availabilityId", authenticate, validate(availabilityIdParamsSchema, "params"), validate(updateAvailabilitySchema), availabilityController.update);
availabilityRouter.post("/:availabilityId/cancel", authenticate, validate(availabilityIdParamsSchema, "params"), availabilityController.cancel);
availabilityRouter.get("/:availabilityId", validate(availabilityIdParamsSchema, "params"), availabilityController.getPublic);
