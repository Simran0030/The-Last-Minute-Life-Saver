import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Flame,
  CheckCircle2,
  BrainCircuit,
  Zap,
  Sparkles,
  Play,
  CheckSquare,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Award,
  Clock,
  Skull,
  Activity,
  Smile,
  AlertTriangle,
  Download
} from "lucide-react";
import { Task, HabitGoal } from "../types";
import { getUrgencyBadgeColor } from "../utils";

interface DashboardViewProps {
  tasks: Task[];
  habits: HabitGoal[];
  onStartSprint: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onCompleteHabit: (id: string) => void;
  onResetHabit: (id: string) => void;
  onClaimGrace: (id: string) => void;
  onAddTask: (title: string, category: "urgent-important" | "important-not-urgent" | "urgent-not-important" | "not-urgent-not-important") => void;
  userName?: string | null;
  onDownloadBackup?: () => void;
}

export default function DashboardView({
  tasks,
  habits,
  onStartSprint,
  onToggleTask,
  onCompleteHabit,
  onResetHabit,
  onClaimGrace,
  onAddTask,
  userName,
  onDownloadBackup
}: DashboardViewProps) {
  // Mental Offloader state
  const [quickTitle, setQuickTitle] = useState("");
  const [quickCategory, setQuickCategory] = useState<"urgent-important" | "important-not-urgent" | "urgent-not-important" | "not-urgent-not-important">("urgent-important");

  // Selected Eisenhower Matrix Quadrant filter for interactive display
  const [selectedQuadrant, setSelectedQuadrant] = useState<string | null>(null);

  // Hardcoded motivational quotes list
  const QUOTES = [
    { text: "Procrastination is the art of keeping up with yesterday.", author: "Don Marquis" },
    { text: "You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr." },
    { text: "Only put off until tomorrow what you are willing to die having left undone.", author: "Pablo Picasso" },
    { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { text: "Procrastination makes easy things hard, and hard things harder.", author: "Mason Cooley" }
  ];

  // Rotate quotes based on date/hour
  const currentQuoteIndex = new Date().getHours() % QUOTES.length;
  const quote = QUOTES[currentQuoteIndex];

  // Calculations for Stats
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const totalTasks = tasks.length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const paralysisOvercome = tasks.filter(t => !t.completed && t.hasDeconstructed).length;
  const activeHabitStreaks = habits.map(h => h.streak);
  const maxHabitStreak = activeHabitStreaks.length > 0 ? Math.max(...activeHabitStreaks) : 0;

  // Calculate Cognitive Momentum Score (0-100)
  // Base is 30% for resting mental capacity.
  // We add:
  // - 10% for every completed task (max 40%)
  // - 10% for every deconstructed task (max 20%)
  // - 5% for every habit streak day (max 30%)
  const taskCompletionWeight = Math.min(completedTasks.length * 10, 40);
  const deconstructWeight = Math.min(paralysisOvercome * 10, 20);
  const habitStreakWeight = Math.min(maxHabitStreak * 5, 30);
  const momentumScore = Math.min(100, 15 + taskCompletionWeight + deconstructWeight + habitStreakWeight);

  // Momentum descriptions and style states
  let momentumText = "Frozen";
  let momentumColor = "text-rose-500";
  let momentumBg = "bg-rose-500/10";
  let momentumBorder = "border-rose-500/20";
  let momentumLabel = "Stagnation Zone";

  if (momentumScore > 75) {
    momentumText = "Unstoppable";
    momentumColor = "text-emerald-400";
    momentumBg = "bg-emerald-500/10";
    momentumBorder = "border-emerald-500/20";
    momentumLabel = "Hyper-Focus Flow";
  } else if (momentumScore > 50) {
    momentumText = "Productive Flow";
    momentumColor = "text-amber-400";
    momentumBg = "bg-amber-500/10";
    momentumBorder = "border-amber-500/20";
    momentumLabel = "Momentum Gained";
  } else if (momentumScore > 25) {
    momentumText = "Warming Up";
    momentumColor = "text-blue-400";
    momentumBg = "bg-blue-500/10";
    momentumBorder = "border-blue-500/20";
    momentumLabel = "Defrosting Paralysis";
  }

  // Handle Quick Add Action
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onAddTask(quickTitle.trim(), quickCategory);
    setQuickTitle("");
  };

  // Group tasks for Matrix Quadrants count
  const quadrantTasks = {
    "urgent-important": tasks.filter(t => t.category === "urgent-important"),
    "important-not-urgent": tasks.filter(t => t.category === "important-not-urgent"),
    "urgent-not-important": tasks.filter(t => t.category === "urgent-not-important"),
    "not-urgent-not-important": tasks.filter(t => t.category === "not-urgent-not-important")
  };

  // Find most urgent uncompleted task to offer as a Quick Kickstart
  // Filter for tasks in "urgent-important" first, then any uncompleted
  const sortedUncompleted = [...activeTasks].sort((a, b) => {
    // Sort urgent-important first
    if (a.category === "urgent-important" && b.category !== "urgent-important") return -1;
    if (a.category !== "urgent-important" && b.category === "urgent-important") return 1;
    // Next sort by attentionLevel
    const priorityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
    return priorityWeight[b.attentionLevel] - priorityWeight[a.attentionLevel];
  });
  const focusCandidate = sortedUncompleted[0];

  // Category breakdown calculations for Visual Bar Chart
  const categories = [
    { key: "urgent-important", name: "Urgent & Important", color: "bg-rose-500", barColor: "from-rose-600 to-rose-400" },
    { key: "important-not-urgent", name: "Important but Not Urgent", color: "bg-amber-500", barColor: "from-amber-600 to-amber-400" },
    { key: "urgent-not-important", name: "Urgent but Not Important", color: "bg-blue-500", barColor: "from-blue-600 to-blue-400" },
    { key: "not-urgent-not-important", name: "Not Urgent / Not Important", color: "bg-slate-500", barColor: "from-slate-600 to-slate-400" }
  ];

  const categoryCounts = categories.map(cat => {
    const total = tasks.filter(t => t.category === cat.key).length;
    const completed = tasks.filter(t => t.category === cat.key && t.completed).length;
    return {
      ...cat,
      total,
      completed,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });

  const maxCategoryCount = Math.max(...categoryCounts.map(c => c.total), 1);

  return (
    <div className="space-y-8">
      {/* Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-rose-500/5 to-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white mb-2 font-sans">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400">{userName || "Survivor"}</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium max-w-xl italic leading-relaxed">
              &ldquo;{quote.text}&rdquo; &mdash; <span className="text-rose-400 font-mono font-bold not-italic">{quote.author}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/60 px-4 py-2.5 rounded-2xl">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Today's Focus State</span>
                <span className="text-xs font-bold text-slate-200">Executive Dashboard Ready</span>
              </div>
            </div>

            {onDownloadBackup && (
              <button
                onClick={onDownloadBackup}
                className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white border border-emerald-500/20 px-4 py-2.5 rounded-2xl font-bold text-xs transition duration-200 shadow-md shadow-emerald-950/30"
                title="Download CSV Backup of all tasks and habits"
              >
                <Download className="w-4 h-4 text-emerald-300" />
                <span>Export Backup</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Stats Block: Radial Momentum & Fast Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Momentum Gauge (Left Column of Bento) */}
        <div className="md:col-span-5 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-rose-500 to-amber-500" />
          
          <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold self-start mb-4 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
            Cognitive Momentum
          </h3>

          {/* Radial Progress Gauge */}
          <div className="relative w-40 h-40 flex items-center justify-center mb-4 mt-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                strokeWidth="8"
                stroke="rgba(30, 41, 59, 0.6)"
                fill="none"
              />
              {/* Foreground animated progress circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                strokeWidth="8"
                stroke="url(#momentumGradient)"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - momentumScore / 100)}`}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="momentumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center Text */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-mono font-black text-slate-100">{momentumScore}%</span>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 mt-1 rounded-md ${momentumBg} ${momentumColor}`}>
                {momentumText}
              </span>
            </div>
          </div>

          <div className="space-y-1 mt-2">
            <span className="text-xs font-bold text-slate-300">{momentumLabel}</span>
            <p className="text-[11px] text-slate-400 max-w-[240px]">
              Earn points by completing tasks, deconstructing complex items, and maintaining streaks.
            </p>
          </div>
        </div>

        {/* Executive Function Metrics (Right Column of Bento) */}
        <div className="md:col-span-7 grid grid-cols-2 gap-4">
          
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between hover:border-rose-500/20 transition duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition duration-300" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Total Tasks Completed</span>
              <span className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div>
              <span className="text-2xl md:text-3xl font-mono font-bold text-slate-100 tracking-tight">
                {completedTasks.length} <span className="text-xs text-slate-500">/ {totalTasks}</span>
              </span>
              <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-1.5 block">{completionRate}% Completion Rate</span>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between hover:border-amber-500/20 transition duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition duration-300" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Paralysis Defeated</span>
              <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <BrainCircuit className="w-4 h-4" />
              </span>
            </div>
            <div>
              <span className="text-2xl md:text-3xl font-mono font-bold text-slate-100 tracking-tight">
                {paralysisOvercome}
              </span>
              <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                Large blocks of anxiety broken down into step-by-step action items.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between hover:border-blue-500/20 transition duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition duration-300" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Max Habit Shield</span>
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Zap className="w-4 h-4" />
              </span>
            </div>
            <div>
              <span className="text-2xl md:text-3xl font-mono font-bold text-slate-100 tracking-tight">
                {maxHabitStreak} <span className="text-xs text-slate-500">days</span>
              </span>
              <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                Active streak of healthy routines keeping procrastination at bay.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-500/20 transition duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition duration-300" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Resilience Graces</span>
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Smile className="w-4 h-4" />
              </span>
            </div>
            <div>
              <span className="text-2xl md:text-3xl font-mono font-bold text-slate-100 tracking-tight">
                {habits.filter(h => h.slipUpGraceUsed).length} <span className="text-xs text-slate-500">active</span>
              </span>
              <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                Compassionate slip-up guards activated to save routine momentum.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Interactive Eisenhower Matrix Quadrant Map */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-amber-500 h-20" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-sans font-extrabold text-slate-100 text-md tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Executive Urgency Heatmap
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Click any quadrant to filter and tackle tasks based on Eisenhower urgency.
            </p>
          </div>

          {selectedQuadrant && (
            <button
              onClick={() => setSelectedQuadrant(null)}
              className="text-[10px] font-mono bg-slate-850 hover:bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-800 transition duration-200"
            >
              Clear Filter [x]
            </button>
          )}
        </div>

        {/* 2x2 Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Urgent & Important */}
          <div
            onClick={() => setSelectedQuadrant(selectedQuadrant === "urgent-important" ? null : "urgent-important")}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-300 ${
              selectedQuadrant === "urgent-important"
                ? "bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-950/20"
                : "bg-slate-950/60 border-slate-850 hover:border-rose-500/30 hover:bg-slate-900/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Q1: DO IMMEDIATELY</span>
              </div>
              <span className="text-xs font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">
                {quadrantTasks["urgent-important"].length} Tasks
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Critical deadlines, crisis resolution, active procrastination sprints.</p>
          </div>

          {/* Important but Not Urgent */}
          <div
            onClick={() => setSelectedQuadrant(selectedQuadrant === "important-not-urgent" ? null : "important-not-urgent")}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-300 ${
              selectedQuadrant === "important-not-urgent"
                ? "bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-950/20"
                : "bg-slate-950/60 border-slate-850 hover:border-amber-500/30 hover:bg-slate-900/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Q2: PLAN & SCHEDULE</span>
              </div>
              <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                {quadrantTasks["important-not-urgent"].length} Tasks
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Routines, values, long-term learning, high leverage projects.</p>
          </div>

          {/* Urgent but Not Important */}
          <div
            onClick={() => setSelectedQuadrant(selectedQuadrant === "urgent-not-important" ? null : "urgent-not-important")}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-300 ${
              selectedQuadrant === "urgent-not-important"
                ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-950/20"
                : "bg-slate-950/60 border-slate-850 hover:border-blue-500/30 hover:bg-slate-900/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Q3: STREAMLINE / DELEGATE</span>
              </div>
              <span className="text-xs font-mono font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                {quadrantTasks["urgent-not-important"].length} Tasks
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Interruptions, minor emails, urgent reports without real core value.</p>
          </div>

          {/* Not Urgent & Not Important */}
          <div
            onClick={() => setSelectedQuadrant(selectedQuadrant === "not-urgent-not-important" ? null : "not-urgent-not-important")}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-300 ${
              selectedQuadrant === "not-urgent-not-important"
                ? "bg-slate-500/10 border-slate-500 shadow-lg shadow-slate-950/20"
                : "bg-slate-950/60 border-slate-850 hover:border-slate-500/30 hover:bg-slate-900/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Q4: DROP / ELIMINATE</span>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-500/20 text-slate-300 px-2 py-0.5 rounded-full">
                {quadrantTasks["not-urgent-not-important"].length} Tasks
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Distractions, doom-scrolling, trivial anxiety-induced tasks.</p>
          </div>

        </div>

        {/* Selected Quadrant Interactive Task List Dropdown */}
        <AnimatePresence>
          {selectedQuadrant && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 border-t border-slate-800/80 pt-4 overflow-hidden"
            >
              <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1">
                <span>Filtered Tasks:</span>
                <span className="text-rose-400 capitalize">{selectedQuadrant.replace("-", " & ")}</span>
              </h4>

              {tasks.filter(t => t.category === selectedQuadrant).length === 0 ? (
                <div className="bg-slate-950/50 rounded-xl p-6 text-center border border-slate-900">
                  <Smile className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-mono">No tasks found in this quadrant.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {tasks.filter(t => t.category === selectedQuadrant).map((task) => (
                    <div
                      key={task.id}
                      className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between gap-4 hover:border-slate-700/60 transition"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          onClick={() => onToggleTask(task.id)}
                          className="mt-0.5 text-slate-500 hover:text-rose-500 transition shrink-0"
                        >
                          <CheckSquare className={`w-4 h-4 ${task.completed ? "text-emerald-500" : ""}`} />
                        </button>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold text-slate-200 truncate ${task.completed ? "line-through text-slate-500" : ""}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {task.durationEstimate && (
                              <span className="text-[9px] font-mono bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                {task.durationEstimate}
                              </span>
                            )}
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${getUrgencyBadgeColor(task.attentionLevel)}`}>
                              {task.attentionLevel}
                            </span>
                            {task.hasDeconstructed && (
                              <span className="text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                Deconstructed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!task.completed && (
                          <button
                            onClick={() => onStartSprint(task)}
                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black transition flex items-center gap-1 shrink-0"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>Sprint</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Two Column Layout: Quick offloader & Procrastination Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Rapid Brain-Dump Mind Offloader */}
        <div className="lg:col-span-5 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 relative shadow-xl overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-transparent h-12" />
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-5 h-5 text-rose-500" />
              <h3 className="font-sans font-extrabold text-slate-100 text-sm tracking-tight">
                Mental Panic Offloader
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Get overwhelming panic items out of your working memory immediately. Place them securely into the planner.
            </p>
            
            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1 font-bold">
                  What is freezing you?
                </label>
                <input
                  type="text"
                  placeholder="e.g., Email professor about extension, review slide deck"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1 font-bold">
                  Eisenhower Quadrant Allocation
                </label>
                <select
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/10 rounded-xl px-3 py-2 text-xs outline-none transition"
                >
                  <option value="urgent-important">Q1: Urgent & Important (Do now)</option>
                  <option value="important-not-urgent">Q2: Important & Not Urgent (Schedule)</option>
                  <option value="urgent-not-important">Q3: Urgent & Not Important (Streamline)</option>
                  <option value="not-urgent-not-important">Q4: Not Urgent & Not Important (Drop)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!quickTitle.trim()}
                className="w-full py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-40 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/20"
              >
                <span>Offload Task</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Visual Category Allocation Audit */}
        <div className="lg:col-span-7 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-amber-500 to-transparent h-12" />
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-sans font-extrabold text-slate-100 text-sm tracking-tight">
                Workload Category Allocation Audit
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Real-time audit of cognitive loads across different urgency states.
            </p>

            <div className="space-y-4">
              {categoryCounts.map((cat) => {
                const ratio = cat.total > 0 ? (cat.total / maxCategoryCount) * 100 : 0;
                return (
                  <div key={cat.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-300 font-semibold">{cat.name}</span>
                      <span className="font-mono text-slate-400">
                        {cat.completed} / {cat.total} completed ({cat.pct}%)
                      </span>
                    </div>
                    <div className="relative w-full bg-slate-950 h-3 rounded-full border border-slate-900 overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${cat.barColor} transition-all duration-1000`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Hero Sprint recommendation card */}
      {focusCandidate && (
        <div className="bg-gradient-to-r from-rose-950/40 via-amber-950/20 to-slate-950 border border-rose-500/20 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
              <span className="text-[10px] font-mono text-rose-300 uppercase tracking-widest font-black">HIGH PRIORITY FOCUS RECOMMENDATION</span>
            </div>
            <h4 className="text-xs font-bold text-slate-100">{focusCandidate.title}</h4>
            <p className="text-[11px] text-slate-400">
              {focusCandidate.description || "No description provided. This task is currently blocking your schedule. Clear it now!"}
            </p>
          </div>

          <button
            onClick={() => onStartSprint(focusCandidate)}
            className="px-5 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 shadow-lg shadow-rose-950/40 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Launch Anti-Freeze Sprint</span>
          </button>
        </div>
      )}

      {/* Active Habits Resilience Board */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-blue-500 to-transparent h-12" />
        
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="font-sans font-extrabold text-slate-100 text-sm tracking-tight">
              Habit Shield Monitor
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Daily / Weekly Routines</span>
        </div>

        {habits.length === 0 ? (
          <div className="bg-slate-950/50 rounded-xl p-8 text-center border border-slate-900">
            <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-mono">No habits defined. Add healthy habits in the Habits tab to gain momentum shield!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {habits.map((habit) => {
              // Calculate target of 21 days
              const lockPct = Math.min(Math.round((habit.streak / 21) * 100), 100);
              return (
                <div key={habit.id} className="bg-slate-950 border border-slate-850/80 rounded-xl p-4 space-y-3 hover:border-slate-800 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{habit.title}</h4>
                      <span className="text-[9px] font-mono text-slate-500 capitalize">{habit.frequency} frequency</span>
                    </div>

                    <div className="flex items-center gap-1 text-rose-500 font-mono text-xs font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                      <Flame className="w-3.5 h-3.5 animate-pulse" />
                      <span>{habit.streak}d</span>
                    </div>
                  </div>

                  {/* Lock progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>Locking Momentum</span>
                      <span>{habit.streak}/21 days</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-850">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${lockPct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-900 justify-end">
                    {habit.streak > 0 && (
                      <button
                        onClick={() => onResetHabit(habit.id)}
                        className="p-1 text-slate-500 hover:text-rose-500 transition"
                        title="Reset habit streak"
                      >
                        <Skull className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!habit.slipUpGraceUsed && (
                      <button
                        onClick={() => onClaimGrace(habit.id)}
                        className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[9px] font-mono font-bold hover:bg-amber-500/20 transition"
                        title="Protect streak when missed"
                      >
                        Claim Grace
                      </button>
                    )}

                    <button
                      onClick={() => onCompleteHabit(habit.id)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold transition flex items-center gap-1 shadow-md shadow-blue-950/40"
                    >
                      <Check className="w-3 h-3" />
                      <span>Log</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline implementation of simple Check icon to keep package neat
function Check({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}
