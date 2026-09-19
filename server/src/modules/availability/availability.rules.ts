import { AppError } from "../../lib/errors";

export const MIN_SLOT_MINUTES = 15;
export const MAX_SLOT_HOURS = 12;
export const MAX_ADVANCE_DAYS = 90;

const MIN_DURATION_MS = MIN_SLOT_MINUTES * 60 * 1000;
const MAX_DURATION_MS = MAX_SLOT_HOURS * 60 * 60 * 1000;
const MAX_ADVANCE_MS = MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000;

export function normalizeSkills(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (trimmed && !seen.has(key)) {
      seen.add(key);
      normalized.push(trimmed);
    }
  }
  return normalized;
}

export function parseWindow(startTime: string, endTime: string): { start: number; end: number } {
  const start = Date.parse(startTime);
  const end = Date.parse(endTime);

  if (Number.isNaN(start)) {
    throw AppError.badRequest("Start time must be a valid ISO date and time.");
  }
  if (Number.isNaN(end)) {
    throw AppError.badRequest("End time must be a valid ISO date and time.");
  }
  if (end <= start) {
    throw AppError.badRequest("End time must be after start time.");
  }

  return { start, end };
}

export function assertCreatableWindow(startTime: string, endTime: string, now: number = Date.now()): void {
  const { start, end } = parseWindow(startTime, endTime);
  const duration = end - start;

  if (start <= now) {
    throw AppError.badRequest("Start time must be in the future.");
  }
  if (duration < MIN_DURATION_MS) {
    throw AppError.badRequest(`Availability must last at least ${MIN_SLOT_MINUTES} minutes.`);
  }
  if (duration > MAX_DURATION_MS) {
    throw AppError.badRequest(`Availability must last at most ${MAX_SLOT_HOURS} hours.`);
  }
  if (start - now > MAX_ADVANCE_MS) {
    throw AppError.badRequest(`Availability can be published at most ${MAX_ADVANCE_DAYS} days in advance.`);
  }
}
