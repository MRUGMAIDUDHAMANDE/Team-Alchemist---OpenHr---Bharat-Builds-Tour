import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contactService, type ContactStore } from "../src/modules/contact/contact.service";
import { createContactSchema } from "../src/modules/contact/contact.schemas";
import type { ContactMessage } from "../src/modules/contact/contact.types";

function createStore() {
  const created: ContactMessage[] = [];
  const store: ContactStore = {
    async create(message: ContactMessage) {
      created.push(message);
      return message;
    },
  };
  return { store, created };
}

describe("contactService.submit", () => {
  it("stores the message as new with a generated id", async () => {
    const { store, created } = createStore();
    const result = await contactService.submit(
      { name: "Asha", email: "Asha@Example.com", category: "General", message: "How does pricing work?" },
      store,
    );

    assert.equal(created.length, 1);
    assert.equal(result.status, "NEW");
    assert.equal(result.email, "Asha@Example.com");
    assert.match(result.messageId, /^[0-9a-f-]{36}$/);
  });
});

describe("createContactSchema", () => {
  it("normalizes the email and bounds the message", () => {
    const parsed = createContactSchema.parse({
      name: "Asha",
      email: " Asha@Example.COM ",
      category: "Safety",
      message: "I want to report a suspicious message.",
    });
    assert.equal(parsed.email, "asha@example.com");

    assert.equal(
      createContactSchema.safeParse({ name: "A", email: "x", category: "General", message: "short" }).success,
      false,
    );
    assert.equal(
      createContactSchema.safeParse({ name: "Asha", email: "a@b.com", category: "Spam", message: "A valid length message here." }).success,
      false,
    );
  });
});
