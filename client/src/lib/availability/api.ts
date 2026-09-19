import { apiRequest } from "@/lib/api/client";
import type { AvailabilityMode } from "@/lib/auth/types";
import type {
  AvailabilityPage,
  AvailabilitySlot,
  CreateAvailabilityInput,
  MineAvailabilityFilter,
  UpdateAvailabilityInput,
} from "./types";

export interface SearchAvailabilityFilter {
  skills?: string;
  location?: string;
  mode?: AvailabilityMode;
  from?: string;
  to?: string;
  maxHourlyRate?: number;
  minRating?: number;
  limit?: number;
  cursor?: string;
}

function mineQuery(filter: MineAvailabilityFilter): string {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  params.set("limit", String(filter.limit ?? 20));
  if (filter.cursor) params.set("cursor", filter.cursor);
  const query = params.toString();
  return query ? `/availability/mine?${query}` : "/availability/mine";
}

export interface InterpretedFilter {
  skills?: string[];
  location?: string;
  from?: string;
  to?: string;
  maxHourlyRate?: number;
  mode?: "ONLINE" | "IN_PERSON" | "ANY";
}

export interface InterpretedSearch {
  requirements: {
    skills: string[];
    location: string | null;
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    maxHourlyRate: number | null;
    mode: "ONLINE" | "IN_PERSON" | "ANY";
  };
  filter: InterpretedFilter;
}

export const availabilityApi = {
  interpret(query: string) {
    return apiRequest<InterpretedSearch>("/search/interpret", {
      method: "POST",
      body: { query },
    });
  },

  search(filter: SearchAvailabilityFilter = {}) {
    const params = new URLSearchParams();
    if (filter.skills) params.set("skills", filter.skills);
    if (filter.location) params.set("location", filter.location);
    if (filter.mode && filter.mode !== "ANY") params.set("mode", filter.mode);
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
    if (filter.maxHourlyRate !== undefined) params.set("maxHourlyRate", String(filter.maxHourlyRate));
    if (filter.minRating !== undefined) params.set("minRating", String(filter.minRating));
    params.set("limit", String(filter.limit ?? 20));
    if (filter.cursor) params.set("cursor", filter.cursor);
    const query = params.toString();
    return apiRequest<AvailabilityPage>(`/availability/search?${query}`);
  },

  create(input: CreateAvailabilityInput) {
    return apiRequest<{ availability: AvailabilitySlot }>("/availability", {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  listMine(filter: MineAvailabilityFilter = {}) {
    return apiRequest<AvailabilityPage>(mineQuery(filter), { auth: true });
  },

  getMine(availabilityId: string) {
    return apiRequest<{ availability: AvailabilitySlot }>(
      `/availability/mine/${encodeURIComponent(availabilityId)}`,
      { auth: true },
    );
  },

  updateMine(availabilityId: string, input: UpdateAvailabilityInput) {
    return apiRequest<{ availability: AvailabilitySlot }>(
      `/availability/${encodeURIComponent(availabilityId)}`,
      { method: "PATCH", body: input, auth: true },
    );
  },

  cancelMine(availabilityId: string) {
    return apiRequest<{ availability: AvailabilitySlot }>(
      `/availability/${encodeURIComponent(availabilityId)}/cancel`,
      { method: "POST", auth: true },
    );
  },
};
