export interface CompoundTaken {
  compoundId: string;
  dose?: number;
  unit?: string;
}

export interface CycleEntryData {
  id: string;
  cycleId: string;
  date: string; // ISO string
  compoundsTaken: CompoundTaken[] | null;
  weight: number | null;
  bodyFatPercent: number | null;
  restingHR: number | null;
  bloodPressure: string | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  mood: number | null;
  energy: number | null;
  libido: number | null;
  appetite: number | null;
  symptoms: string[];
  notes: string | null;
}

export interface BloodworkData {
  id: string;
  cycleId: string;
  date: string; // ISO string
  labName: string | null;
  results: Record<string, number | null>;
  fileUrl: string | null;
  notes: string | null;
}

export interface StackCompoundRef {
  id: string;
  compoundId: string;
  compound: {
    id: string;
    name: string;
    slug: string;
    category: string;
    doseUnit: string | null;
  };
  dose: number | null;
  unit: string | null;
}

export interface CycleData {
  id: string;
  name: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "PAUSED" | "ABORTED";
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  stack: {
    id: string;
    name: string;
    slug: string;
    compounds: StackCompoundRef[];
  } | null;
  entries: CycleEntryData[];
  bloodwork: BloodworkData[];
}

export interface CycleSummary {
  id: string;
  name: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "PAUSED" | "ABORTED";
  startDate: string | null;
  endDate: string | null;
  stack: { name: string; slug: string } | null;
  _count: { entries: number };
  lastEntryDate: string | null;
}
