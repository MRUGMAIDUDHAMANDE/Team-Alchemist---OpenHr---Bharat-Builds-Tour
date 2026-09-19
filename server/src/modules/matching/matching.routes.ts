import { Router } from "express";
import { aiRateLimiter } from "../../middleware/rate-limit";
import { validate } from "../../middleware/validate";
import { matchingController } from "./matching.controller";
import { interpretQuerySchema } from "./matching.schemas";

export const matchingRouter = Router();

matchingRouter.post("/interpret", aiRateLimiter, validate(interpretQuerySchema), matchingController.interpret);
