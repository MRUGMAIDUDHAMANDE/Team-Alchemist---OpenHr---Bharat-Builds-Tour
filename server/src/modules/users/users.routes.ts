import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { usersController } from "./users.controller";
import { updateProfileSchema, userIdParamsSchema } from "./users.schemas";

export const usersRouter = Router();

usersRouter.use(authenticate);
usersRouter.get("/me", usersController.getMe);
usersRouter.patch("/me", validate(updateProfileSchema), usersController.updateMe);
usersRouter.get("/:userId", validate(userIdParamsSchema, "params"), usersController.getPublic);
