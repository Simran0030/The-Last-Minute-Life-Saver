export function formatCountdown(deadlineStr: string): {
  text: string;
  isUrgent: boolean;
  isOverdue: boolean;
  hoursRemaining: number;
} {
  if (!deadlineStr) return { text: "No deadline", isUrgent: false, isOverdue: false, hoursRemaining: Infinity };
  
  const now = new Date();
  const deadline = new Date(deadlineStr);
  const diffMs = deadline.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return {
      text: "OVERDUE",
      isUrgent: true,
      isOverdue: true,
      hoursRemaining: 0
    };
  }
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  const hoursRemaining = diffMs / (1000 * 60 * 60);
  const isUrgent = hoursRemaining <= 24; // Less than 24 hours left is urgent
  
  if (diffDays > 0) {
    return {
      text: `${diffDays}d ${diffHours % 24}h remaining`,
      isUrgent,
      isOverdue: false,
      hoursRemaining
    };
  }
  
  const hours = diffHours % 24;
  const mins = diffMins % 60;
  const secs = diffSecs % 60;
  
  return {
    text: `${hours}h ${mins}m ${secs}s remaining`,
    isUrgent,
    isOverdue: false,
    hoursRemaining
  };
}

export function getUrgencyBadgeColor(attentionLevel: string): string {
  switch (attentionLevel) {
    case "CRITICAL":
      return "bg-rose-500/20 text-rose-400 border border-rose-500/30";
    case "HIGH":
      return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    case "MEDIUM":
      return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    case "LOW":
      return "bg-slate-500/20 text-slate-400 border border-slate-500/30";
    default:
      return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
  }
}
