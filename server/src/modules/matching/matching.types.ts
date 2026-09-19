export type SearchMode = "ONLINE" | "IN_PERSON" | "ANY";

export interface InterpretedRequirements {
  skills: string[];
  location: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  maxHourlyRate: number | null;
  mode: SearchMode;
}

export interface AppliedSearchFilter {
  skills?: string[];
  location?: string;
  from?: string;
  to?: string;
  maxHourlyRate?: number;
  mode?: SearchMode;
}
