export type LeakageFindingType = "PHONE" | "EMAIL" | "UPI_HANDLE" | "PAYMENT_MENTION" | "OFF_PLATFORM_PHRASE";

export interface LeakageFinding {
  type: LeakageFindingType;
  count: number;
}

export interface LeakageScan {
  flagged: boolean;
  findings: LeakageFinding[];
  excerpt: string | null;
}
