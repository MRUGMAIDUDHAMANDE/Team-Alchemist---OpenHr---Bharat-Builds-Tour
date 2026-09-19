import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { bookingsController } from "./bookings.controller";
import { bookingIdParamsSchema, listBookingsQuerySchema } from "./bookings.schemas";

export const bookingsRouter = Router();

bookingsRouter.use(authenticate);
bookingsRouter.get("/mine", validate(listBookingsQuerySchema, "query"), bookingsController.listMine);
bookingsRouter.get("/:bookingId", validate(bookingIdParamsSchema, "params"), bookingsController.getOne);
