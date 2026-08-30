import type { Grade } from "@/lib/ladder";

export type ItemStatus = "pending" | "done";

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export interface RoutineBlock {
  id: string;
  label: string;
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  days_of_week: number[]; // 0 = Sunday ... 6 = Saturday
  active: boolean;
  created_at: string;
}

export interface Topic {
  id: string;
  name: string;
  subject: string | null;
  created_at: string;
}

export interface StudyItem {
  id: string;
  topic_id: string;
  scheduled_date: string; // "YYYY-MM-DD"
  status: ItemStatus;
  rung: number; // 0..5
  grade: Grade | null;
  routine_block_id: string | null;
  created_at: string;
  last_reviewed_at: string | null;
}

/** A due item joined with its topic + how many times that topic has been reviewed. */
export interface DueItem {
  id: string;
  topicId: string;
  topicName: string;
  subject: string | null;
  rung: number;
  scheduledDate: string;
  reviewCount: number;
  overdue: boolean;
  routineBlockId: string | null;
}

/** Today's items bucketed under a routine block (or "Anytime" when null). */
export interface TodayGroup {
  key: string;
  label: string;
  timeRange: string | null; // "06:00 – 08:00"
  startMinutes: number; // for ordering; Anytime sorts last
  items: DueItem[];
}

/** One row on the Tasks screen: a topic with its scheduling summary. */
export interface TaskRow {
  topicId: string;
  topicName: string;
  subject: string | null;
  createdAt: string;
  pendingCount: number;
  doneCount: number;
  nextDate: string | null;
  currentRung: number | null;
  items: {
    id: string;
    scheduledDate: string;
    status: ItemStatus;
    rung: number;
    grade: Grade | null;
    routineLabel: string | null;
  }[];
}
