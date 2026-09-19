import { apiRequest } from "@/lib/api/client";
import type {
  AvailabilityPage,
  AvailabilitySlot,
  CreateAvailabilityInput,
  MineAvailabilityFilter,
  UpdateAvailabilityInput,
} from "./types";

function mineQuery(filter: MineAvailabilityFilter): string {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  params.set("limit", String(filter.limit ?? 20));
  if (filter.cursor) params.set("cursor", filter.cursor);
  const query = params.toString();
  return query ? `/availability/mine?${query}` : "/availability/mine";
}

export const availabilityApi = {
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
