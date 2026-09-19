import type { AvailabilitySlot } from "./availability.types";

export type SearchMode = "ONLINE" | "IN_PERSON" | "ANY";

export interface SearchQueryPlan {
  keyCondition: string;
  filterExpression?: string;
  names: Record<string, string>;
  values: Record<string, unknown>;
  limit: number;
}

export interface SearchTextFilter {
  skills?: string[];
  location?: string;
}

export function buildSearchQuery(input: {
  to?: string;
  maxHourlyRate?: number;
  minRating?: number;
  mode?: SearchMode;
  limit: number;
  effectiveFrom: string;
}): SearchQueryPlan {
  const names: Record<string, string> = { "#status": "status" };
  const values: Record<string, unknown> = { ":status": "AVAILABLE", ":from": input.effectiveFrom };
  const keyConditions = ["#status = :status"];
  const filters = ["#endTime > :from"];
  names["#endTime"] = "endTime";

  if (input.to) {
    names["#startTime"] = "startTime";
    values[":to"] = input.to;
    keyConditions.push("#startTime <= :to");
  }

  if (input.maxHourlyRate !== undefined) {
    names["#hourlyRate"] = "hourlyRate";
    values[":maxHourlyRate"] = input.maxHourlyRate;
    filters.push("#hourlyRate <= :maxHourlyRate");
  }

  if (input.minRating !== undefined) {
    names["#publisherRatingAverage"] = "publisherRatingAverage";
    values[":minRating"] = input.minRating;
    filters.push("#publisherRatingAverage >= :minRating");
  }

  if (input.mode === "ONLINE" || input.mode === "IN_PERSON") {
    names["#mode"] = "mode";
    values[":mode"] = input.mode;
    values[":anyMode"] = "ANY";
    filters.push("(#mode = :mode OR #mode = :anyMode)");
  }

  return {
    keyCondition: keyConditions.join(" AND "),
    ...(filters.length > 0 ? { filterExpression: filters.join(" AND ") } : {}),
    names,
    values,
    limit: input.limit,
  };
}

export function matchesSearchText(slot: AvailabilitySlot, filter: SearchTextFilter): boolean {
  if (filter.skills && filter.skills.length > 0) {
    const requested = filter.skills.map((skill) => skill.trim().toLowerCase()).filter((skill) => skill.length > 0);
    const offered = slot.skills.map((skill) => skill.toLowerCase());
    const matched = requested.some((skill) => offered.some((candidate) => candidate.includes(skill)));
    if (!matched) return false;
  }

  if (filter.location) {
    const wanted = filter.location.trim().toLowerCase();
    if (wanted && !slot.location.toLowerCase().includes(wanted)) return false;
  }

  return true;
}
