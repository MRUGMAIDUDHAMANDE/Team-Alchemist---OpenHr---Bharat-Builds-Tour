import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AppError } from "../../lib/errors";
import { validate } from "../../middleware/validate";
import { contactController } from "./contact.controller";
import { createContactSchema } from "./contact.schemas";

const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError({
        code: "RATE_LIMITED",
        status: 429,
        message: "Too many messages. Try again later.",
      }),
    );
  },
});

export const contactRouter = Router();

contactRouter.post("/", contactRateLimiter, validate(createContactSchema), contactController.submit);
