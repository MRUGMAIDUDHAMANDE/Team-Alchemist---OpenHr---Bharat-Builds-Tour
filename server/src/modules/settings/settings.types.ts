export interface PlatformSettings {
  settingKey: string;
  buyerCommissionPercent: number;
  sellerCommissionPercent: number;
  updatedAt: string;
}

export const DEFAULT_SETTINGS: Omit<PlatformSettings, "settingKey" | "updatedAt"> = {
  buyerCommissionPercent: 5,
  sellerCommissionPercent: 10,
};
