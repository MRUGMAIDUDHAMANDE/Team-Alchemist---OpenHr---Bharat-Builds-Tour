import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { requestsController } from "./requests.controller";
import {
  createRequestSchema,
  listRequestsQuerySchema,
  requestIdParamsSchema,
} from "./requests.schemas";

export const requestsRouter = Router();

requestsRouter.use(authenticate);
requestsRouter.post("/", validate(createRequestSchema), requestsController.create);
requestsRouter.get("/mine", validate(listRequestsQuerySchema, "query"), requestsController.listMine);
requestsRouter.post("/:requestId/accept", validate(requestIdParamsSchema, "params"), requestsController.accept);
requestsRouter.post("/:requestId/reject", validate(requestIdParamsSchema, "params"), requestsController.reject);
requestsRouter.post("/:requestId/cancel", validate(requestIdParamsSchema, "params"), requestsController.cancel);
