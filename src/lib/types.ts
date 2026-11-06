export type Overtime = {
  enabled: boolean;
  /** Hours per day before overtime starts; null = no daily limit */
  dailyHours: number | null;
  /** Hours per week before overtime starts; null = no weekly limit */
  weeklyHours: number | null;
  /** Pay multiplier for overtime hours, e.g. 1.5 */
  multiplier: number;
};

/** How a job is paid: by the hour, or a fixed price every time the job is added to the calendar. */
export type PayType = 'hourly' | 'fixed';

/** A group of jobs (a sector, a client, a type of work...). A job belongs to one category or none. */
export type Category = {
  id: string;
  name: string;
};

/** An employer, client or workplace; owns its shift types, pay rate and overtime rules. */
export type Job = {
  id: string;
  name: string;
  color: string;
  /** The category the job is listed under; null = uncategorized */
  categoryId: string | null;
  payType: PayType;
  /** Hourly rate, the same for every shift of the job; null = no pay tracking */
  hourlyRate: number | null;
  /** Price of each calendar entry when payType is "fixed", whatever the hours; null = no pay tracking */
  fixedRate: number | null;
  overtime: Overtime;
};

export type ShiftType = {
  id: string;
  jobId: string;
  name: string;
  /** "HH:mm" */
  start: string;
  /** "HH:mm"; an end earlier than the start means the shift crosses midnight */
  end: string;
  breakMin: number;
};

/** A shift type as stored inside a job template (the ids are created when a job is made from it). */
export type TemplateShift = Omit<ShiftType, 'id' | 'jobId'>;

/** A ready-made job: its settings and shift types, used to create new jobs quickly. */
export type JobTemplate = {
  id: string;
  name: string;
  color: string;
  payType: PayType;
  hourlyRate: number | null;
  fixedRate: number | null;
  overtime: Overtime;
  shifts: TemplateShift[];
};

export type ShiftEntry = {
  id: string;
  /** "YYYY-MM-DD" in local time */
  date: string;
  jobId: string;
  /** The shift type this entry started from; null = a one-off schedule with its own hours */
  typeId: string | null;
  note: string;
  /**
   * Hours of this day. Shift types are only suggestions: anything set here replaces the
   * type's value, and entries without a type carry their own.
   */
  start?: string;
  end?: string;
  breakMin?: number;
};

/**
 * A personal agenda item (appointment, reminder, birthday...). Unlike shifts, events never
 * count towards hours, pay, summaries or exports.
 */
export type AgendaEvent = {
  id: string;
  /** "YYYY-MM-DD" in local time */
  date: string;
  title: string;
  allDay: boolean;
  /** "HH:mm"; only meaningful when allDay is false */
  start: string;
  /** "HH:mm"; only meaningful when allDay is false */
  end: string;
  note: string;
  color: string;
};

/** A reusable agenda event (everything except its date). */
export type EventTemplate = Omit<AgendaEvent, 'id' | 'date'> & { id: string };

export type Settings = {
  currency: string;
  /** 0 = Sunday, 1 = Monday */
  weekStartsOn: 0 | 1;
  /** Tapping a shift type adds it straight away instead of opening the editor first */
  quickAdd: boolean;
  /** Look for a newer release on GitHub when the app opens */
  checkUpdates: boolean;
};

/** A repeating pattern: day i of the cycle uses cycle[i] (null = nothing that day). */
export type Rotation = {
  id: string;
  name: string;
  cycle: (string | null)[];
};

export type AppState = {
  categories: Category[];
  jobs: Job[];
  types: ShiftType[];
  entries: ShiftEntry[];
  rotations: Rotation[];
  templates: JobTemplate[];
  eventTemplates: EventTemplate[];
  events: AgendaEvent[];
  settings: Settings;
};
