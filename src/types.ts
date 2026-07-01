export interface MicroStep {
  title: string;
  durationMinutes: number;
  description: string;
  order: number;
  isFirstStep: boolean;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO date string (YYYY-MM-DDTHH:MM)
  durationEstimate: string; // e.g. "2h", "45m"
  category: "urgent-important" | "important-not-urgent" | "urgent-not-important" | "not-urgent-not-important" | "pending";
  attentionLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  reasoning?: string;
  completed: boolean;
  microSteps?: MicroStep[];
  extensionRequest?: string;
  motivation?: string;
  hasDeconstructed?: boolean;
}

export interface HabitGoal {
  id: string;
  title: string;
  frequency: "daily" | "weekly";
  streak: number;
  lastCompletedDate?: string; // YYYY-MM-DD
  slipUpGraceUsed: boolean; // True if they missed but we granted grace to keep streak alive
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  sources?: Array<{ title: string; uri: string }>;
}

export interface KickstartDraft {
  title: string;
  content: string;
  tips: string[];
}
