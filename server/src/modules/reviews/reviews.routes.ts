import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { reviewsController } from "./reviews.controller";
import { createReviewSchema, listReviewsQuerySchema } from "./reviews.schemas";

export const reviewsRouter = Router();

reviewsRouter.use(authenticate);
reviewsRouter.post("/", validate(createReviewSchema), reviewsController.create);
reviewsRouter.get("/", validate(listReviewsQuerySchema, "query"), reviewsController.list);
