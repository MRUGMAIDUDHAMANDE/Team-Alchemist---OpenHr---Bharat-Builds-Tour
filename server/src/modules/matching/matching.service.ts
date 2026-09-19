import type { ConverseCommandInput, ConverseCommandOutput } from "@aws-sdk/client-bedrock-runtime";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { normalizeSkills } from "../availability/availability.rules";
import { parseModelOutput } from "./matching.schemas";
import type { AppliedSearchFilter, InterpretedRequirements, SearchMode } from "./matching.types";

export interface BedrockPort {
  converse(input: ConverseCommandInput): Promise<ConverseCommandOutput>;
}

const TOOL_NAME = "extract_requirements";
const KOLKATA_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function kolkataParts(now: number): { date: string; weekday: number } {
  const shifted = new Date(now + KOLKATA_OFFSET_MS);
  const date = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
  return { date, weekday: shifted.getUTCDay() };
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(parsed.getUTCDate())}`;
}

export function resolveDate(raw: string | null | undefined, now: number): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim().toLowerCase();
  const { date, weekday } = kolkataParts(now);

  if (value === "today") return date;
  if (value === "tomorrow") return addDays(date, 1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))) return value;

  const weekdayIndex = WEEKDAYS.indexOf(value);
  if (weekdayIndex >= 0) {
    return addDays(date, (weekdayIndex - weekday + 7) % 7);
  }
  return undefined;
}

export function resolveRequirements(
  raw: { skills: string[]; location?: string | null; date?: string | null; startTime?: string | null; endTime?: string | null; maxHourlyRate?: number | null; mode?: SearchMode | null },
  now: number,
): { requirements: InterpretedRequirements; filter: AppliedSearchFilter } {
  const skills = normalizeSkills(raw.skills ?? []);
  const location = raw.location?.trim() ? raw.location.trim() : null;
  const date = resolveDate(raw.date, now);
  const startTime = raw.startTime ?? null;
  const endTime = raw.endTime ?? null;
  const maxHourlyRate = raw.maxHourlyRate ?? null;
  const mode: SearchMode = raw.mode ?? "ANY";

  const requirements: InterpretedRequirements = { skills, location, date: date ?? null, startTime, endTime, maxHourlyRate, mode };
  const filter: AppliedSearchFilter = {};
  if (skills.length > 0) filter.skills = skills;
  if (location) filter.location = location;
  if (maxHourlyRate !== null) filter.maxHourlyRate = maxHourlyRate;
  if (mode !== "ANY") filter.mode = mode;

  if (date && startTime && endTime && endTime > startTime) {
    filter.from = `${date}T${startTime}:00+05:30`;
    filter.to = `${date}T${endTime}:00+05:30`;
  } else if (date && startTime) {
    filter.from = `${date}T${startTime}:00+05:30`;
  } else if (date && endTime) {
    filter.to = `${date}T${endTime}:00+05:30`;
  } else if (date) {
    filter.from = `${date}T00:00:00+05:30`;
    filter.to = `${date}T23:59:59+05:30`;
  } else if (startTime && endTime && endTime > startTime) {
    const today = kolkataParts(now).date;
    filter.from = `${today}T${startTime}:00+05:30`;
    filter.to = `${today}T${endTime}:00+05:30`;
  }

  return { requirements, filter };
}

function buildConverseInput(query: string, today: string, modelId: string): ConverseCommandInput {
  return {
    modelId,
    messages: [{ role: "user", content: [{ text: query }] }],
    system: [
      {
        text: `Extract structured search requirements for hiring a skilled person for a task. Today is ${today} (Asia/Kolkata). Always call extract_requirements. Times are 24-hour HH:MM. Use 1-4 short skill names (examples: React, Plumbing, Maths, Photography). Set location only when a place is named. Set date to today, tomorrow, a weekday name, or YYYY-MM-DD when mentioned. Set mode to ONLINE only when remote, online, or virtual work is stated, IN_PERSON only when on-site, in-person, or a visit is stated, otherwise ANY. Leave everything else null.`,
      },
    ],
    inferenceConfig: { maxTokens: 400, temperature: 0 },
    toolConfig: {
      tools: [
        {
          toolSpec: {
            name: TOOL_NAME,
            description: "Structured search requirements extracted from a hiring request.",
            inputSchema: {
              json: {
                type: "object",
                properties: {
                  skills: { type: "array", items: { type: "string" } },
                  location: { type: ["string", "null"] },
                  date: { type: ["string", "null"] },
                  startTime: { type: ["string", "null"] },
                  endTime: { type: ["string", "null"] },
                  maxHourlyRate: { type: ["integer", "null"] },
                  mode: { type: "string", enum: ["ONLINE", "IN_PERSON", "ANY"] },
                },
                required: ["skills"],
              },
            },
          },
        },
      ],
      toolChoice: { tool: { name: TOOL_NAME } },
    },
  };
}

function extractToolInput(output: ConverseCommandOutput): unknown {
  const blocks = output.output?.message?.content ?? [];
  for (const block of blocks) {
    if (block.toolUse && block.toolUse.name === TOOL_NAME) {
      return block.toolUse.input;
    }
  }
  throw new Error("Model did not return requirements.");
}

export const matchingService = {
  async interpretQuery(
    query: string,
    modelId: string,
    bedrock: BedrockPort,
    now: number = Date.now(),
  ): Promise<{ requirements: InterpretedRequirements; filter: AppliedSearchFilter }> {
    let raw: ReturnType<typeof parseModelOutput>;
    try {
      const output = await bedrock.converse(buildConverseInput(query, kolkataParts(now).date, modelId));
      raw = parseModelOutput(extractToolInput(output));
    } catch (error) {
      logger.warn("Bedrock interpretation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw AppError.internal("AI matching is temporarily unavailable. Use the filters instead.", error);
    }

    return resolveRequirements(raw, now);
  },
};
