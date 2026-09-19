import type { settingsRepository } from "./settings.repository";
import type { UpdateSettingsInput } from "./settings.schemas";
import type { PlatformSettings } from "./settings.types";

export type SettingsStore = Pick<typeof settingsRepository, "getPlatform" | "updatePlatform">;

export const settingsService = {
  async getPublicSettings(store: SettingsStore): Promise<{ buyerCommissionPercent: number; sellerCommissionPercent: number }> {
    const settings = await store.getPlatform();
    return {
      buyerCommissionPercent: settings.buyerCommissionPercent,
      sellerCommissionPercent: settings.sellerCommissionPercent,
    };
  },

  async getPlatformSettings(store: SettingsStore): Promise<PlatformSettings> {
    return store.getPlatform();
  },

  async updatePlatformSettings(patch: UpdateSettingsInput, store: SettingsStore): Promise<PlatformSettings> {
    await store.getPlatform();
    return store.updatePlatform(patch);
  },
};
