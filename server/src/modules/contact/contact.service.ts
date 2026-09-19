import { randomUUID } from "node:crypto";
import type { contactRepository } from "./contact.repository";
import type { CreateContactInput } from "./contact.schemas";
import type { ContactMessage } from "./contact.types";

export type ContactStore = Pick<typeof contactRepository, "create">;

export const contactService = {
  async submit(input: CreateContactInput, store: ContactStore): Promise<ContactMessage> {
    const timestamp = new Date().toISOString();
    return store.create({
      messageId: randomUUID(),
      name: input.name,
      email: input.email,
      category: input.category,
      message: input.message,
      status: "NEW",
      createdAt: timestamp,
    });
  },
};
