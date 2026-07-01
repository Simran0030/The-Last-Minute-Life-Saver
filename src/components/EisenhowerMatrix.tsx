import { Task } from "../types";
import { motion } from "motion/react";
import { AlertCircle, Calendar, ArrowRight, BrainCircuit, CheckSquare, Clock, Zap, Sparkles, Check } from "lucide-react";
import { getUrgencyBadgeColor, formatCountdown } from "../utils";

interface EisenhowerMatrixProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onDeconstructTask: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
}

export default function EisenhowerMatrix({
  tasks,
  onSelectTask,
  onDeconstructTask,
  onToggleComplete,
}: EisenhowerMatrixProps) {
  
  const quadrants = [
    {
      id: "urgent-important",
      title: "DO FIRST (Urgent & Important)",
      subtitle: "Absolute priority. Consequence-critical deadlines.",
      colorClass: "border-rose-500/30 bg-rose-950/10 text-rose-400",
      icon: <Zap className="w-5 h-5 text-rose-400 animate-pulse" />,
      tasks: tasks.filter((t) => t.category === "urgent-important" && !t.completed),
    },
    {
      id: "important-not-urgent",
      title: "SCHEDULE (Important but Not Urgent)",
      subtitle: "High-value growth. Break down early to avoid stress.",
      colorClass: "border-amber-500/30 bg-amber-950/10 text-amber-400",
      icon: <Clock className="w-5 h-5 text-amber-400" />,
      tasks: tasks.filter((t) => t.category === "important-not-urgent" && !t.completed),
    },
    {
      id: "urgent-not-important",
      title: "DELEGATE / SHORTCUT (Urgent, Not Important)",
      subtitle: "Speed run. Minimize cognitive overload here.",
      colorClass: "border-blue-500/30 bg-blue-950/10 text-blue-400",
      icon: <ArrowRight className="w-5 h-5 text-blue-400" />,
      tasks: tasks.filter((t) => t.category === "urgent-not-important" && !t.completed),
    },
    {
      id: "not-urgent-not-important",
      title: "ELIMINATE / DEFER (Not Urgent or Important)",
      subtitle: "Low stake. Tackle only when free, or delete.",
      colorClass: "border-slate-700/50 bg-slate-900/10 text-slate-400",
      icon: <AlertCircle className="w-5 h-5 text-slate-500" />,
      tasks: tasks.filter((t) => t.category === "not-urgent-not-important" && !t.completed),
    },
  ];

  const pendingTasks = tasks.filter((t) => (t.category === "pending" || !t.category) && !t.completed);

  return (
    <div id="eisenhower-matrix-root" className="space-y-6">
      {/* Pending / Unsorted Tasks notification banner */}
      {pendingTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-950 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-slate-100 text-sm">
                You have {pendingTasks.length} unsorted task{pendingTasks.length > 1 ? "s" : ""}!
              </h4>
              <p className="text-xs text-slate-400">
                Hit "Auto-Prioritize Tasks" to let your AI coach organize them instantly.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Grid of Quadrants */}
      <div className="grid md:grid-cols-2 gap-6">
        {quadrants.map((quad) => (
          <div
            key={quad.id}
            className={`border rounded-2xl p-5 flex flex-col min-h-[300px] transition-all hover:shadow-lg ${quad.colorClass}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-sans font-bold text-sm tracking-wide text-slate-200 uppercase flex items-center gap-2">
                  {quad.icon}
                  {quad.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{quad.subtitle}</p>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 bg-slate-800/80 rounded border border-slate-700/60 text-slate-300">
                {quad.tasks.length} active
              </span>
            </div>

            {/* Tasks list */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[250px] pr-1">
              {quad.tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 text-center text-slate-500 border border-dashed border-slate-800/40 rounded-xl">
                  <span className="text-xs italic">No active tasks in this quadrant.</span>
                </div>
              ) : (
                quad.tasks.map((task) => {
                  const { text: countdownText, isUrgent, isOverdue } = formatCountdown(task.deadline);
                  
                  let leftBorderColor = "border-l-slate-600";
                  if (quad.id === "urgent-important") leftBorderColor = "border-l-rose-500";
                  else if (quad.id === "important-not-urgent") leftBorderColor = "border-l-amber-500";
                  else if (quad.id === "urgent-not-important") leftBorderColor = "border-l-blue-500";

                  return (
                    <motion.div
                      key={task.id}
                      layoutId={`task-${task.id}`}
                      className={`bg-slate-950/80 hover:bg-slate-950 border-l-2 ${leftBorderColor} border-y border-r border-slate-800/60 hover:border-slate-700/80 p-4 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/40 group relative`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3 items-start flex-1">
                          <button
                            onClick={() => onToggleComplete(task.id)}
                            className="mt-0.5 w-5 h-5 rounded-md border border-slate-700 hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center transition-all duration-200 shrink-0 group/checkbox"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover/checkbox:opacity-100 transition-opacity" />
                          </button>
                          <div className="space-y-1">
                            <h4 className="font-sans font-bold text-sm text-slate-100 group-hover:text-white transition line-clamp-2">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                            {task.reasoning && (
                              <p className="text-[11px] text-slate-500 italic bg-slate-900/40 px-2.5 py-1.5 rounded-xl border border-slate-900/80 mt-1.5">
                                Coach: {task.reasoning}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons & info */}
                        <div className="flex flex-col items-end shrink-0 gap-2">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${getUrgencyBadgeColor(task.attentionLevel)}`}>
                            {task.attentionLevel}
                          </span>
                        </div>
                      </div>

                      {/* Footer Info & Action buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-900/60 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                          <Calendar className={`w-3.5 h-3.5 ${isUrgent ? "text-rose-400" : "text-slate-500"}`} />
                          <span className={isUrgent ? "text-rose-300 font-semibold" : ""}>
                            {countdownText}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {task.hasDeconstructed ? (
                            <button
                              onClick={() => onSelectTask(task)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-md flex items-center gap-1 transition"
                            >
                              <BrainCircuit className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                              <span>Focus Steps ({task.microSteps?.filter(s => s.completed).length || 0}/{task.microSteps?.length || 0})</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onDeconstructTask(task)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md flex items-center gap-1 transition"
                            >
                              <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />
                              <span>AI Break Down</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
