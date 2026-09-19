import type { LeakageFinding, LeakageFindingType, LeakageScan } from "./leakage.types";

const PHONE_PATTERN = /(^|[\s(])(?:\+91[\s-]?)?([6-9]\d{4}[\s-]?\d{5})(?=$|[\s).,!?])/g;
const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const UPI_PATTERN = /(^|[\s"'([])([a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,})(?=$|[\s'").,!?])/g;

const PAYMENT_MENTIONS = [
  "upi",
  "gpay",
  "google pay",
  "phonepe",
  "paytm",
  "paypal",
  "bank transfer",
  "account number",
  "ifsc",
  "cash",
  "cashfree",
  "razorpay",
];

const OFF_PLATFORM_PHRASES = [
  "pay directly",
  "pay me directly",
  "pay you directly",
  "pay outside",
  "outside the platform",
  "off the platform",
  "off-platform",
  "cancel this and",
  "direct payment",
  "pay in person",
  "whatsapp",
  "telegram",
  "call me",
  "text me",
  "message me on",
];

function countMatches(pattern: RegExp, text: string): number {
  pattern.lastIndex = 0;
  let count = 0;
  while (pattern.exec(text) !== null) {
    count += 1;
    if (count > 10) break;
  }
  pattern.lastIndex = 0;
  return count;
}

function countPhrase(text: string, phrase: string): number {
  const lowered = text.toLowerCase();
  const target = phrase.toLowerCase();
  let count = 0;
  let index = lowered.indexOf(target);
  while (index >= 0 && count < 10) {
    count += 1;
    index = lowered.indexOf(target, index + target.length);
  }
  return count;
}

function redact(text: string): string {
  return text
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(UPI_PATTERN, (_match, prefix: string) => `${prefix}[redacted-upi]`)
    .replace(PHONE_PATTERN, (_match, prefix: string) => `${prefix}[redacted-phone]`);
}

function excerptAround(text: string, maxLength = 160): string {
  const redacted = redact(text);
  if (redacted.length <= maxLength) return redacted;
  return `${redacted.slice(0, maxLength - 1)}…`;
}

function maskEmails(text: string): string {
  EMAIL_PATTERN.lastIndex = 0;
  return text.replace(EMAIL_PATTERN, (match) => " ".repeat(match.length));
}

export function scanText(text: string): LeakageScan {
  const findings: LeakageFinding[] = [];
  const withoutEmails = maskEmails(text);

  const push = (type: LeakageFindingType, count: number) => {
    if (count > 0) findings.push({ type, count });
  };

  push("EMAIL", countMatches(EMAIL_PATTERN, text));
  push("PHONE", countMatches(PHONE_PATTERN, withoutEmails));
  push("UPI_HANDLE", countMatches(UPI_PATTERN, withoutEmails));
  push(
    "PAYMENT_MENTION",
    PAYMENT_MENTIONS.reduce((sum, phrase) => sum + countPhrase(text, phrase), 0),
  );
  push(
    "OFF_PLATFORM_PHRASE",
    OFF_PLATFORM_PHRASES.reduce((sum, phrase) => sum + countPhrase(text, phrase), 0),
  );

  return {
    flagged: findings.length > 0,
    findings,
    excerpt: findings.length > 0 ? excerptAround(text) : null,
  };
}
