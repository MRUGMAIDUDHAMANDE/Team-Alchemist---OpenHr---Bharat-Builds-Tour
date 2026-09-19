import { Router } from "express";
import { authenticate, requireGroup } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { adminController } from "./admin.controller";
import { listReportsQuerySchema, reportIdParamsSchema, setContactStatusSchema, setReportStatusSchema, setUserStatusSchema } from "./admin.schemas";
import { userIdParamsSchema } from "../users/users.schemas";
import { z } from "zod";

const messageIdParamsSchema = z
  .object({
    messageId: z.string().trim().min(1, "Message ID is required").max(128, "Message ID is too long"),
  })
  .strict();

export const adminRouter = Router();

adminRouter.use(authenticate, requireGroup("ADMIN"));
adminRouter.get("/overview", adminController.overview);
adminRouter.get("/users", adminController.listUsers);
adminRouter.patch("/users/:userId/status", validate(userIdParamsSchema, "params"), validate(setUserStatusSchema), adminController.setUserStatus);
adminRouter.get("/bookings", adminController.listBookings);
adminRouter.get("/contact", adminController.listContact);
adminRouter.patch("/contact/:messageId/status", validate(messageIdParamsSchema, "params"), validate(setContactStatusSchema), adminController.resolveContact);
adminRouter.get("/reports", validate(listReportsQuerySchema, "query"), adminController.listReports);
adminRouter.patch("/reports/:reportId/status", validate(reportIdParamsSchema, "params"), validate(setReportStatusSchema), adminController.resolveReport);
