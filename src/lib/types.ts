export type ShiftType = {
  id: string;
  name: string;
  color: string;
  /** "HH:mm" */
  start: string;
  /** "HH:mm"; an end earlier than the start means the shift crosses midnight */
  end: string;
  breakMin: number;
  /** null = no pay tracking for this shift type */
  hourlyRate: number | null;
};

export type ShiftEntry = {
  id: string;
  /** "YYYY-MM-DD" in local time */
  date: string;
  typeId: string;
  note: string;
  /** Per-day overrides of the shift type's defaults */
  start?: string;
  end?: string;
  breakMin?: number;
};

export type Overtime = {
  enabled: boolean;
  /** Hours per day before overtime starts; null = no daily limit */
  dailyHours: number | null;
  /** Hours per week before overtime starts; null = no weekly limit */
  weeklyHours: number | null;
  /** Pay multiplier for overtime hours, e.g. 1.5 */
  multiplier: number;
};

export type Settings = {
  currency: string;
  /** 0 = Sunday, 1 = Monday */
  weekStartsOn: 0 | 1;
  overtime: Overtime;
};

/** A repeating pattern: day i of the cycle uses cycle[i] (null = nothing that day). */
export type Rotation = {
  id: string;
  name: string;
  cycle: (string | null)[];
};

export type AppState = {
  types: ShiftType[];
  entries: ShiftEntry[];
  rotations: Rotation[];
  settings: Settings;
};
