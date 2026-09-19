import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { bookingsController } from "./bookings.controller";
import { bookingIdParamsSchema, cancelBookingSchema, listBookingsQuerySchema } from "./bookings.schemas";

export const bookingsRouter = Router();

bookingsRouter.use(authenticate);
bookingsRouter.get("/mine", validate(listBookingsQuerySchema, "query"), bookingsController.listMine);
bookingsRouter.post("/:bookingId/start", validate(bookingIdParamsSchema, "params"), bookingsController.start);
bookingsRouter.post("/:bookingId/complete", validate(bookingIdParamsSchema, "params"), bookingsController.complete);
bookingsRouter.post("/:bookingId/cancel", validate(bookingIdParamsSchema, "params"), validate(cancelBookingSchema), bookingsController.cancel);
bookingsRouter.get("/:bookingId", validate(bookingIdParamsSchema, "params"), bookingsController.getOne);
