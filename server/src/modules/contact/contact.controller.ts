import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { contactRepository } from "./contact.repository";
import type { CreateContactInput } from "./contact.schemas";
import { contactService } from "./contact.service";

export const contactController = {
  submit: asyncHandler(async (req: Request, res: Response) => {
    const message = await contactService.submit(req.body as CreateContactInput, contactRepository);
    res.status(201).json({ data: { message: "Message received. We respond within two business days.", messageId: message.messageId } });
  }),
};
