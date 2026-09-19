import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { mediaController } from "./media.controller";
import {
  confirmUploadSchema,
  listMediaQuerySchema,
  mediaIdParamsSchema,
  uploadUrlSchema,
  viewUrlQuerySchema,
} from "./media.schemas";

export const mediaRouter = Router();

mediaRouter.use(authenticate);
mediaRouter.post("/upload-url", validate(uploadUrlSchema), mediaController.createUploadUrl);
mediaRouter.post("/confirm", validate(confirmUploadSchema), mediaController.confirmUpload);
mediaRouter.get("/mine", validate(listMediaQuerySchema, "query"), mediaController.listMine);
mediaRouter.get("/view-url", validate(viewUrlQuerySchema, "query"), mediaController.viewByKey);
mediaRouter.get("/:mediaId/view-url", validate(mediaIdParamsSchema, "params"), mediaController.createViewUrl);
