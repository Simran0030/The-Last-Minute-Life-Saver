import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, RotateCcw, CheckCircle, X, ShieldAlert, Award, Volume2, VolumeX, Flame } from "lucide-react";
import { MicroStep } from "../types";

interface FocusTimerProps {
  microStep: MicroStep | null;
  taskTitle: string;
  onCompleteStep: () => void;
  onClose: () => void;
}

const PANIC_TIPS = [
  "Take one deep breath. You do not need to do the whole task, just this 5-minute step.",
  "Turn off all other browser tabs. Put your phone in another room or out of arm's reach.",
  "Action cures anxiety. Starting is 90% of the battle. The first step is absurdly simple.",
  "Your brain is lying to you: it will NOT take 3 hours, and you do not need perfect inspiration to start.",
  "Done is better than perfect. Write garbage if you must; you can polish it later."
];

export default function FocusTimer({ microStep, taskTitle, onCompleteStep, onClose }: FocusTimerProps) {
  const stepDuration = microStep ? microStep.durationMinutes : 25;
  const [secondsLeft, setSecondsLeft] = useState(stepDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [panicTipIndex, setPanicTipIndex] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Rotate tips every 15 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setPanicTipIndex((prev) => (prev + 1) % PANIC_TIPS.length);
    }, 15000);
    return () => clearInterval(tipInterval);
  }, []);

  // Timer countdown logic
  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      timerRef.current = setTimeout(() => {
        setSecondsLeft((prev) => prev - 1);
        
        // Mock ticking sound if unmuted
        if (!isMuted && secondsLeft % 2 === 0) {
          playSubtleTick();
        }
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      playAlarm();
      onCompleteStep();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, secondsLeft, isMuted]);

  // Reset timer if step changes
  useEffect(() => {
    setSecondsLeft(stepDuration * 60);
    setIsActive(false);
  }, [microStep]);

  const playSubtleTick = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // Browser audio context might be blocked or uninitialized
    }
  };

  const playAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {}
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(stepDuration * 60);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const percentComplete = ((stepDuration * 60 - secondsLeft) / (stepDuration * 60)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      id="focus-timer-container"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative shadow-2xl overflow-hidden"
    >
      {/* Background glow effects */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
          <h3 className="font-sans font-bold text-lg text-slate-100">Bionic Focus Sprint</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition"
            title={isMuted ? "Unmute clock tick" : "Mute clock tick"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />}
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-center">
        {/* Left Side: Timer Circle */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* SVG circle meter */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="78"
                className="stroke-slate-800 fill-none"
                strokeWidth="6"
              />
              <motion.circle
                cx="88"
                cy="88"
                r="78"
                className="stroke-rose-500 fill-none"
                strokeWidth="7"
                strokeDasharray={490}
                animate={{
                  strokeDashoffset: 490 - (490 * percentComplete) / 100,
                }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </svg>
            
            {/* Timer digits */}
            <div className="text-center z-10">
              <div className="text-4xl font-mono font-bold tracking-tight text-white mb-1">
                {formatTime(secondsLeft)}
              </div>
              <div className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">
                {isActive ? "Sprinting" : "Paused"}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={resetTimer}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Reset Timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTimer}
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 border shadow-lg transition duration-200 ${
                isActive
                  ? "bg-rose-600/30 text-rose-300 border-rose-500/40 hover:bg-rose-600/40"
                  : "bg-emerald-600/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/40"
              }`}
            >
              {isActive ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pause Sprint</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Focus</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Step Details & Coaching */}
        <div className="md:col-span-7 space-y-4">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
            <div className="text-xs font-mono text-emerald-500 uppercase tracking-wider mb-1">Active Micro-Task</div>
            <h4 className="font-sans font-bold text-white text-md mb-2">{microStep?.title || "Custom Sprint Session"}</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              {microStep?.description || "Focus completely for 25 minutes on taking immediate action. Mute notifications and start."}
            </p>
          </div>

          {/* Panic tips carousel */}
          <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl flex gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-sans font-bold text-rose-400 uppercase tracking-wider mb-1">Procrastination Defeater Tip</div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={panicTipIndex}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs text-slate-400 leading-relaxed italic"
                >
                  "{PANIC_TIPS[panicTipIndex]}"
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <button
            onClick={onCompleteStep}
            className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <CheckCircle className="w-4 h-4" />
            <span>I've Completed This Step!</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
