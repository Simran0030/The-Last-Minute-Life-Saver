import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  User,
  Zap,
  Play,
  CheckSquare,
  X,
  Undo2,
  AlertCircle,
  ThumbsUp,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Menu,
  BrainCircuit,
  MapPin,
  LogIn,
  LogOut,
  Sun,
  Moon,
  LayoutDashboard,
  Download,
  Mic,
  MicOff,
  Cloud
} from "lucide-react";
import { Task, HabitGoal, ChatMessage, KickstartDraft, MicroStep } from "./types";
import { formatCountdown, getUrgencyBadgeColor } from "./utils";
import FocusTimer from "./components/FocusTimer";
import EisenhowerMatrix from "./components/EisenhowerMatrix";
import DashboardView from "./components/DashboardView";
import DriveBackupView from "./components/DriveBackupView";

// Firebase imports
import { auth, db, googleProvider, signInWithPopup, signOut } from "./lib/firebase";
import { onAuthStateChanged, User as FirebaseUser, GoogleAuthProvider } from "firebase/auth";
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, writeBatch } from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial Demo Tasks
const INITIAL_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Final Term Paper on Generative AI",
    description: "Write a 1500-word essay discussing the evolution of large language models and cognitive assistants.",
    deadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString().slice(0, 16), // 18 hours from now
    durationEstimate: "4 hours",
    category: "pending",
    attentionLevel: "NONE",
    completed: false,
    hasDeconstructed: false,
  },
  {
    id: "task-2",
    title: "Quarterly Marketing Budget Review",
    description: "Align marketing team spendings and calculate remaining budget for Q3. Need to present this to the lead.",
    deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16), // 4 hours from now
    durationEstimate: "2 hours",
    category: "urgent-important",
    attentionLevel: "CRITICAL",
    reasoning: "High priority budget update due in less than 4 hours; delay would block team approvals.",
    completed: false,
    hasDeconstructed: true,
    motivation: "You've got this! Let's handle the first 5-minute task and build immediate momentum.",
    microSteps: [
      { title: "Open the Q2 Budget Google Sheet", durationMinutes: 5, description: "Just find the URL and keep the tab open. Don't look at numbers yet.", order: 1, isFirstStep: true, completed: true },
      { title: "Review the high-level summary categories", durationMinutes: 10, description: "Highlight columns that look unusually high or low.", order: 2, isFirstStep: false, completed: false },
      { title: "Fill in the Q3 forecasted categories", durationMinutes: 15, description: "Duplicate last quarter's numbers as a starting baseline to avoid blank-page paralysis.", order: 3, isFirstStep: false, completed: false },
    ],
    extensionRequest: "Hi [Manager Name],\n\nI am currently finalizing the Q3 forecasted budget categories to ensure we have maximum accuracy for our team review. To deliver a complete and flawless analysis, I would highly appreciate an extra 4 hours to wrap up the spreadsheet figures.\n\nThank you for your understanding!\n\nBest regards,\n[My Name]"
  },
  {
    id: "task-3",
    title: "Update Project Landing Page Code",
    description: "Need to deploy the minor CSS fixes for the mobile navigation drawer.",
    deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 4 days from now
    durationEstimate: "1 hour",
    category: "important-not-urgent",
    attentionLevel: "MEDIUM",
    completed: false,
    hasDeconstructed: false,
  }
];

// Initial Demo Habits
const INITIAL_HABITS: HabitGoal[] = [
  { id: "habit-1", title: "Review tomorrow's schedule the night before", frequency: "daily", streak: 5, lastCompletedDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10), slipUpGraceUsed: false },
  { id: "habit-2", title: "Complete 1 mini sprint session", frequency: "daily", streak: 3, lastCompletedDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10), slipUpGraceUsed: false },
  { id: "habit-3", title: "Clean workstation desk clutter", frequency: "weekly", streak: 1, lastCompletedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), slipUpGraceUsed: false },
];

export default function App() {
  // Load tasks & habits from localStorage or use defaults
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("lmls_tasks");
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [habits, setHabits] = useState<HabitGoal[]>(() => {
    const saved = localStorage.getItem("lmls_habits");
    return saved ? JSON.parse(saved) : INITIAL_HABITS;
  });

  // Task creation state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState("");

  // UI state variables
  const [selectedTaskForSprint, setSelectedTaskForSprint] = useState<Task | null>(null);
  const [activeSprintStepIndex, setActiveSprintStepIndex] = useState<number>(-1);
  const [isDeconstructing, setIsDeconstructing] = useState<string | null>(null); // Task ID
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "eisenhower" | "drafts" | "habits" | "spots" | "drive">("dashboard");
  
  // Kickstart Draft Generator state
  const [draftTaskTitle, setDraftTaskTitle] = useState("");
  const [draftTaskDesc, setDraftTaskDesc] = useState("");
  const [draftType, setDraftType] = useState("outline");
  const [generatedDraft, setGeneratedDraft] = useState<KickstartDraft | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  // Firebase Auth state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Study Spots Grounding state
  const [studyQuery, setStudyQuery] = useState("");
  const [studySpotsResult, setStudySpotsResult] = useState<{ text: string; sources: any[] } | null>(null);
  const [isSearchingSpots, setIsSearchingSpots] = useState(false);

  // Coach Chatbot state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "welcome-coach",
        role: "assistant",
        text: "Hey! I'm your Emergency Procrastination Coach. Paralyzed by a deadline? Staring at a blank page? Drop a line here and let's conquer it together!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [isCoachTyping, setIsCoachTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Dictation / Microphone API state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const originalInputRef = useRef<string>("");
  const isSpeechSupported = typeof window !== "undefined" && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);

  // Google Drive state
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("lmls_theme") as "light" | "dark") || "dark"
  );
  const isLight = theme === "light";

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("lmls_theme", theme);
  }, [theme]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Toast message
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Synchronize Auth and Firestore data on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        showToast(`Signed in securely via Google Cloud Account!`, "success");
        try {
          const tasksQuery = query(collection(db, "tasks"), where("userId", "==", currentUser.uid));
          let tasksSnap;
          try {
            tasksSnap = await getDocs(tasksQuery);
          } catch (e) {
            handleFirestoreError(e, OperationType.LIST, "tasks");
            return;
          }
          const fbTasks: Task[] = [];
          tasksSnap.forEach((docSnap) => {
            fbTasks.push({ ...docSnap.data() } as Task);
          });

          const habitsQuery = query(collection(db, "habits"), where("userId", "==", currentUser.uid));
          let habitsSnap;
          try {
            habitsSnap = await getDocs(habitsQuery);
          } catch (e) {
            handleFirestoreError(e, OperationType.LIST, "habits");
            return;
          }
          const fbHabits: HabitGoal[] = [];
          habitsSnap.forEach((docSnap) => {
            fbHabits.push({ ...docSnap.data() } as HabitGoal);
          });

          if (fbTasks.length === 0 && fbHabits.length === 0) {
            const localTasks = localStorage.getItem("lmls_tasks");
            const localHabits = localStorage.getItem("lmls_habits");
            const parsedTasks: Task[] = localTasks ? JSON.parse(localTasks) : INITIAL_TASKS;
            const parsedHabits: HabitGoal[] = localHabits ? JSON.parse(localHabits) : INITIAL_HABITS;

            // Namespace task and habit IDs with the unique userId to prevent collision with other users' default items
            const updatedTasks = parsedTasks.map((t) => {
              const suffix = `-${currentUser.uid}`;
              const newId = t.id.endsWith(suffix) ? t.id : `${t.id}${suffix}`;
              return { ...t, id: newId };
            });
            const updatedHabits = parsedHabits.map((h) => {
              const suffix = `-${currentUser.uid}`;
              const newId = h.id.endsWith(suffix) ? h.id : `${h.id}${suffix}`;
              return { ...h, id: newId };
            });

            const batch = writeBatch(db);
            updatedTasks.forEach((t) => {
              const docRef = doc(db, "tasks", t.id);
              batch.set(docRef, { ...t, userId: currentUser.uid });
            });
            updatedHabits.forEach((h) => {
              const docRef = doc(db, "habits", h.id);
              batch.set(docRef, { ...h, userId: currentUser.uid });
            });
            
            try {
              await batch.commit();
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, "batch_commit");
              return;
            }
            
            setTasks(updatedTasks);
            setHabits(updatedHabits);
            showToast("Synced local guest data to Google Cloud Firestore!", "success");
          } else {
            setTasks(fbTasks);
            setHabits(fbHabits);
          }
        } catch (err) {
          console.error("Error loading Firestore data:", err);
          showToast("Failed to fetch cloud database.", "error");
        }
      } else {
        const savedTasks = localStorage.getItem("lmls_tasks");
        const savedHabits = localStorage.getItem("lmls_habits");
        setTasks(savedTasks ? JSON.parse(savedTasks) : INITIAL_TASKS);
        setHabits(savedHabits ? JSON.parse(savedHabits) : INITIAL_HABITS);
      }
    });

    return () => unsubscribe();
  }, []);

  // Synchronize localStorage for guests
  useEffect(() => {
    if (!user) {
      localStorage.setItem("lmls_tasks", JSON.stringify(tasks));
    }
  }, [tasks, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem("lmls_habits", JSON.stringify(habits));
    }
  }, [habits, user]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveAccessToken(credential.accessToken);
        showToast("Signed in and connected to Google Drive!", "success");
      } else {
        showToast("Signed in successfully!", "success");
      }
    } catch (err: any) {
      console.error("Sign in failed:", err);
      showToast("Sign-in failed. Please try again.", "error");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setDriveAccessToken(null);
      showToast("Signed out successfully", "info");
    } catch (err: any) {
      console.error("Sign out failed:", err);
    }
  };

  const handleRestoreData = async (restoredTasks: Task[], restoredHabits: HabitGoal[]) => {
    setTasks(restoredTasks);
    setHabits(restoredHabits);

    if (user) {
      try {
        const updatedTasks = restoredTasks.map((t) => {
          const suffix = `-${user.uid}`;
          const newId = t.id.endsWith(suffix) ? t.id : `${t.id}${suffix}`;
          return { ...t, id: newId, userId: user.uid };
        });
        const updatedHabits = restoredHabits.map((h) => {
          const suffix = `-${user.uid}`;
          const newId = h.id.endsWith(suffix) ? h.id : `${h.id}${suffix}`;
          return { ...h, id: newId, userId: user.uid };
        });

        const batch = writeBatch(db);
        updatedTasks.forEach((t) => {
          const docRef = doc(db, "tasks", t.id);
          batch.set(docRef, t);
        });
        updatedHabits.forEach((h) => {
          const docRef = doc(db, "habits", h.id);
          batch.set(docRef, h);
        });
        await batch.commit();
        setTasks(updatedTasks);
        setHabits(updatedHabits);
      } catch (err) {
        console.error("Failed to sync restored data to Firestore:", err);
        showToast("Restored locally, but cloud database sync failed.", "error");
      }
    } else {
      localStorage.setItem("lmls_tasks", JSON.stringify(restoredTasks));
      localStorage.setItem("lmls_habits", JSON.stringify(restoredHabits));
    }
  };

  const handleDownloadBackupCSV = () => {
    // Construct CSV headers
    const headers = ["Type", "ID", "Title", "Details/Description", "Category/Frequency", "Urgency/Streak", "Status/Grace", "Deadline/LastCompleted"];
    
    const rows: string[][] = [];
    
    // Add Tasks
    tasks.forEach(t => {
      rows.push([
        "Task",
        t.id,
        t.title,
        t.description || "",
        t.category || "unassigned",
        t.attentionLevel || "NONE",
        t.completed ? "Completed" : "Active",
        t.deadline || ""
      ]);
    });
    
    // Add Habits
    habits.forEach(h => {
      rows.push([
        "Habit",
        h.id,
        h.title,
        h.frequency === "daily" ? "Daily habit" : "Weekly habit",
        h.frequency,
        `${h.streak} day streak`,
        h.slipUpGraceUsed ? "Grace Used" : "Grace Available",
        h.lastCompletedDate || "Never"
      ]);
    });

    // Helper to escape CSV values correctly
    const escapeCSV = (val: string) => {
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(val => escapeCSV(String(val))).join(","))
    ].join("\n");

    try {
      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `executive_planner_backup_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Backup CSV downloaded successfully!", "success");
    } catch (err) {
      console.error("Failed to download CSV backup:", err);
      showToast("Could not generate backup file.", "error");
    }
  };

  const handleFindStudySpots = () => {
    if (isSearchingSpots) return;
    setIsSearchingSpots(true);
    const queryToUse = studyQuery.trim() || "quiet study spots and libraries";
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await fetchSpotsFromBackend(latitude, longitude, queryToUse);
        },
        async (error) => {
          console.warn("Geolocation failed or denied. Using default location.", error);
          await fetchSpotsFromBackend(null, null, queryToUse);
        },
        { timeout: 8000 }
      );
    } else {
      fetchSpotsFromBackend(null, null, queryToUse);
    }
  };

  const fetchSpotsFromBackend = async (lat: number | null, lng: number | null, queryText: string) => {
    try {
      const response = await fetch("/api/study-spots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          query: queryText
        })
      });
      
      if (!response.ok) {
        throw new Error("Study spots API error");
      }
      
      const data = await response.json();
      setStudySpotsResult(data);
      showToast("Found top study locations nearby!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to search study spots.", "error");
    } finally {
      setIsSearchingSpots(false);
    }
  };

  // 1. Add Task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      showToast("Please enter a task title!", "error");
      return;
    }

    const t: Task = {
      id: "task-" + Date.now(),
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      deadline: newTaskDeadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      durationEstimate: newTaskDuration.trim() || "1 hour",
      category: "pending",
      attentionLevel: "NONE",
      completed: false,
      hasDeconstructed: false,
    };

    setTasks((prev) => [t, ...prev]);
    
    // Cloud sync
    if (user) {
      setDoc(doc(db, "tasks", t.id), { ...t, userId: user.uid }).catch(err => {
        handleFirestoreError(err, OperationType.CREATE, `tasks/${t.id}`);
      });
    }

    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskDeadline("");
    setNewTaskDuration("");
    showToast("Task added! Tap 'Auto-Prioritize Tasks' to let AI sort it.", "info");
  };

  // 2. Delete Task
  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTaskForSprint?.id === id) {
      setSelectedTaskForSprint(null);
    }
    
    // Cloud sync
    if (user) {
      deleteDoc(doc(db, "tasks", id)).catch(err => {
        handleFirestoreError(err, OperationType.DELETE, `tasks/${id}`);
      });
    }
    showToast("Task deleted.", "info");
  };

  // 3. Complete Task
  const handleToggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updatedTask = { ...t, completed: !t.completed };
          if (user) {
            setDoc(doc(db, "tasks", t.id), { ...updatedTask, userId: user.uid }).catch(err => {
              handleFirestoreError(err, OperationType.UPDATE, `tasks/${t.id}`);
            });
          }
          return updatedTask;
        }
        return t;
      })
    );
    showToast("Progress logged!", "success");
  };

  // 4. AI-Powered Eisenhower Prioritization
  const handleAutoPrioritize = async () => {
    const unsortedTasks = tasks.filter((t) => !t.completed);
    if (unsortedTasks.length === 0) {
      showToast("No active tasks to prioritize!", "error");
      return;
    }

    setIsPrioritizing(true);
    try {
      const response = await fetch("/api/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: unsortedTasks }),
      });

      if (!response.ok) {
        throw new Error("Prioritize API failure");
      }

      const data = await response.json();
      const priorityMap = new Map<string, { category: any; attentionLevel: any; reasoning: string }>();
      
      data.prioritizedTasks.forEach((pt: any) => {
        priorityMap.set(pt.id, {
          category: pt.category,
          attentionLevel: pt.attentionLevel,
          reasoning: pt.reasoning,
        });
      });

      setTasks((prev) =>
        prev.map((t) => {
          const match = priorityMap.get(t.id);
          if (match) {
            const updatedTask = {
              ...t,
              category: match.category,
              attentionLevel: match.attentionLevel,
              reasoning: match.reasoning,
            };
            if (user) {
              setDoc(doc(db, "tasks", t.id), { ...updatedTask, userId: user.uid }).catch(err => {
                handleFirestoreError(err, OperationType.UPDATE, `tasks/${t.id}`);
              });
            }
            return updatedTask;
          }
          return t;
        })
      );
      showToast("Tasks automatically prioritized by AI!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Could not prioritize tasks. Check your GEMINI_API_KEY.", "error");
    } finally {
      setIsPrioritizing(false);
    }
  };

  // 5. AI Task Deconstruction
  const handleDeconstructTask = async (task: Task) => {
    setIsDeconstructing(task.id);
    try {
      const response = await fetch("/api/deconstruct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          deadline: task.deadline,
          durationEstimate: task.durationEstimate,
        }),
      });

      if (!response.ok) {
        throw new Error("Deconstruction API failure");
      }

      const data = await response.json();
      
      // Map response to tasks
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === task.id) {
            const updatedTask = {
              ...t,
              hasDeconstructed: true,
              motivation: data.motivation,
              extensionRequest: data.extensionRequestEmailDraft,
              microSteps: data.microSteps.map((step: any, idx: number) => ({
                ...step,
                completed: false,
              })),
            };
            if (user) {
              setDoc(doc(db, "tasks", t.id), { ...updatedTask, userId: user.uid }).catch(err => {
                handleFirestoreError(err, OperationType.UPDATE, `tasks/${t.id}`);
              });
            }
            return updatedTask;
          }
          return t;
        })
      );

      showToast("Task deconstructed into actionable micro-steps!", "success");
      
      // Auto-open focus timer for the deconstructed task
      const updatedTask = {
        ...task,
        hasDeconstructed: true,
        motivation: data.motivation,
        extensionRequest: data.extensionRequestEmailDraft,
        microSteps: data.microSteps.map((step: any) => ({ ...step, completed: false })),
      };
      setSelectedTaskForSprint(updatedTask);
      setActiveSprintStepIndex(0);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to deconstruct task. Verify GEMINI_API_KEY is configured.", "error");
    } finally {
      setIsDeconstructing(null);
    }
  };

  // 6. Complete Micro-step in Active Sprint
  const handleCompleteMicroStep = () => {
    if (!selectedTaskForSprint || !selectedTaskForSprint.microSteps) return;

    const currentSteps = [...selectedTaskForSprint.microSteps];
    currentSteps[activeSprintStepIndex] = {
      ...currentSteps[activeSprintStepIndex],
      completed: true,
    };

    const isAllDone = currentSteps.every((s) => s.completed);
    const updatedTask = {
      ...selectedTaskForSprint,
      microSteps: currentSteps,
      completed: isAllDone,
    };

    // Update parent list state
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === selectedTaskForSprint.id) {
          if (user) {
            setDoc(doc(db, "tasks", t.id), { ...updatedTask, userId: user.uid }).catch(err => {
              handleFirestoreError(err, OperationType.UPDATE, `tasks/${t.id}`);
            });
          }
          return updatedTask;
        }
        return t;
      })
    );
    setSelectedTaskForSprint(updatedTask);

    showToast(`Step "${currentSteps[activeSprintStepIndex].title}" Completed!`, "success");

    // Move to next step if exists and uncompleted
    const nextIdx = currentSteps.findIndex((s) => !s.completed);
    if (nextIdx !== -1) {
      setActiveSprintStepIndex(nextIdx);
    } else {
      showToast("AMAZING WORK! You conquered all steps & finished the task!", "success");
      setSelectedTaskForSprint(null);
      setActiveSprintStepIndex(-1);
    }
  };

  // 7. Habits Streaks with AI Grace Period
  const handleCompleteHabit = (habitId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        
        if (h.lastCompletedDate === today) {
          showToast("Already logged for today!", "info");
          return h;
        }

        const updatedHabit = {
          ...h,
          streak: h.streak + 1,
          lastCompletedDate: today,
          slipUpGraceUsed: false, // Reset grace on successful completion
        };

        if (user) {
          setDoc(doc(db, "habits", h.id), { ...updatedHabit, userId: user.uid }).catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `habits/${h.id}`);
          });
        }
        return updatedHabit;
      })
    );
    showToast("Habit streak leveled up!", "success");
  };

  // Activate "AI Slip-Up Grace" to keep their streak alive when they miss a habit
  const handleRequestHabitGrace = (habitId: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        if (h.slipUpGraceUsed) {
          showToast("AI grace already claimed once! Complete the habit to reset it.", "error");
          return h;
        }
        const updatedHabit = {
          ...h,
          streak: h.streak, // Retain streak instead of resetting to 0
          slipUpGraceUsed: true,
          lastCompletedDate: new Date().toISOString().slice(0, 10), // Mark as done to buy time
        };

        if (user) {
          setDoc(doc(db, "habits", h.id), { ...updatedHabit, userId: user.uid }).catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `habits/${h.id}`);
          });
        }
        return updatedHabit;
      })
    );
    showToast("AI Grace activated! Streak protected. Get back on track tomorrow!", "success");
  };

  const handleResetHabit = (habitId: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === habitId) {
          const updatedHabit = { ...h, streak: 0, lastCompletedDate: undefined, slipUpGraceUsed: false };
          if (user) {
            setDoc(doc(db, "habits", h.id), { ...updatedHabit, userId: user.uid }).catch(err => {
              handleFirestoreError(err, OperationType.UPDATE, `habits/${h.id}`);
            });
          }
          return updatedHabit;
        }
        return h;
      })
    );
    showToast("Streak reset.", "info");
  };

  // Add Habit
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitFreq, setNewHabitFreq] = useState<"daily" | "weekly">("daily");
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;

    const nh: HabitGoal = {
      id: "habit-" + Date.now(),
      title: newHabitTitle.trim(),
      frequency: newHabitFreq,
      streak: 0,
      slipUpGraceUsed: false,
    };

    setHabits((prev) => [...prev, nh]);
    
    if (user) {
      setDoc(doc(db, "habits", nh.id), { ...nh, userId: user.uid }).catch(err => {
        handleFirestoreError(err, OperationType.CREATE, `habits/${nh.id}`);
      });
    }

    setNewHabitTitle("");
    showToast("Habit tracker setup successful!", "success");
  };

  // 8. Coach Chat Send
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsCoachTyping(true);

    try {
      const response = await fetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          chatHistory: chatMessages.slice(-8), // Keep history compact
          currentTasks: tasks.filter((t) => !t.completed),
        }),
      });

      if (!response.ok) {
        throw new Error("Chat coach api fail");
      }

      const data = await response.json();
      const coachMsg: ChatMessage = {
        id: "msg-" + Date.now() + "-coach",
        role: "assistant",
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources,
      };
      setChatMessages((prev) => [...prev, coachMsg]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: "err-msg",
          role: "assistant",
          text: "I hit a small bump in my brain. But listen to me: put down whatever is distracting you, sit up straight, and write down just ONE word of your task. That's your only job right now!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsCoachTyping(false);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech dictation is not supported in this browser. Try Chrome, Safari, or Edge!", "error");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        originalInputRef.current = chatInput;
        showToast("Listening... Dictate your frustrations!", "info");
      };

      rec.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        const base = originalInputRef.current;
        const separator = base && !base.endsWith(" ") ? " " : "";
        setChatInput(base + separator + finalTranscript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event);
        if (event.error === "not-allowed") {
          showToast("Microphone permission denied. Please allow microphone access in your browser.", "error");
        } else {
          showToast(`Speech recognition error: ${event.error}`, "error");
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Failed to start speech recognition", err);
      showToast("Failed to initialize speech recognition.", "error");
      setIsListening(false);
    }
  };

  // 9. Kickstart Starter Drafts Generation
  const handleGenerateKickstartDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTaskTitle.trim()) {
      showToast("Please specify a starting title", "error");
      return;
    }

    setIsGeneratingDraft(true);
    try {
      const response = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: draftTaskTitle,
          taskDescription: draftTaskDesc,
          draftType: draftType,
        }),
      });

      if (!response.ok) {
        throw new Error("Draft API failure");
      }

      const data = await response.json();
      setGeneratedDraft(data);
      showToast("Kickstart Draft successfully generated!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to generate draft. Please ensure your key is valid.", "error");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Set selected task from focus page deconstruct
  const handleSelectTaskFromBoard = (task: Task) => {
    setSelectedTaskForSprint(task);
    if (task.microSteps && task.microSteps.length > 0) {
      const firstUncompleted = task.microSteps.findIndex((s) => !s.completed);
      setActiveSprintStepIndex(firstUncompleted !== -1 ? firstUncompleted : 0);
    } else {
      setActiveSprintStepIndex(-1);
    }
  };

  // Real-time Cognitive Dashboard metrics
  const activeTasksCount = tasks.filter((t) => !t.completed).length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const totalTasksCount = tasks.length;
  const taskCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const paralysisOvercome = tasks.filter((t) => !t.completed && t.hasDeconstructed).length;
  const totalActiveHabitStreak = habits.reduce((max, h) => (h.streak > max ? h.streak : max), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-rose-500/30 selection:text-white">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/40"
                : toast.type === "error"
                ? "bg-rose-950/90 text-rose-300 border-rose-500/40"
                : "bg-slate-900/90 text-slate-200 border-slate-700/40"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === "info" && <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />}
            <span className="text-xs font-sans font-semibold tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <Flame className="w-6 h-6 text-rose-500 animate-pulse" />
            </div>
            <div>
              <h1 className="font-sans font-extrabold text-lg md:text-xl text-slate-100 tracking-tight flex items-center gap-2">
                The Last-Minute Life Saver
                <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded-full">
                  AI PRO
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Defeating executive paralysis & procrastination sprints
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
            {/* Nav Tabs */}
            <nav className="flex items-center bg-slate-900/80 rounded-xl p-1 border border-slate-800">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === "dashboard" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab("eisenhower")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === "eisenhower" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Planner</span>
              </button>
              <button
                onClick={() => setActiveTab("drafts")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === "drafts" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Kickstart Drafts</span>
              </button>
              <button
                onClick={() => setActiveTab("habits")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === "habits" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Habits</span>
              </button>
              <button
                onClick={() => setActiveTab("spots")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === "spots" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Hideouts</span>
              </button>
              <button
                onClick={() => setActiveTab("drive")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === "drive" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
                id="tab-drive"
              >
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                <span>Drive Backup</span>
              </button>
            </nav>

            {/* Download CSV Backup Button */}
            <button
              onClick={handleDownloadBackupCSV}
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition border border-slate-800 shrink-0 flex items-center gap-1.5"
              title="Download backup as CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xl:inline text-[10px] font-mono font-bold uppercase tracking-wider">Backup</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(isLight ? "dark" : "light")}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-900 rounded-lg transition border border-slate-800 shrink-0"
              title={isLight ? "Activate Dark Mode" : "Activate Light Mode"}
            >
              {isLight ? <Moon className="w-4 h-4 text-rose-500" /> : <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />}
            </button>

            {/* Cloud Sync Authentication Button */}
            <div className="border-l border-slate-800 pl-3">
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-slate-800 border-t-rose-500 rounded-full animate-spin" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                    alt="avatar"
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full border border-rose-500/30"
                  />
                  <div className="hidden xl:block text-left">
                    <p className="text-[10px] font-bold text-slate-300 leading-tight truncate max-w-[80px]">
                      {user.displayName}
                    </p>
                    <p className="text-[8px] font-mono text-emerald-400">Cloud Sync Active</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                    title="Sign Out of Cloud Sync"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-lg text-xs font-bold transition-all duration-250 flex items-center gap-1.5 shadow-md shadow-rose-950/40"
                  title="Securely sync tasks & habits across all your devices using Google Login"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Google Sync</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Real-time Cognitive Dashboard Overview */}
        <div id="cognitive-metrics-dashboard" className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-rose-500/30 transition duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition duration-300" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Active Sprints</span>
              <span className="text-2xl font-mono font-bold text-slate-100 tracking-tight">{activeTasksCount}</span>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 group-hover:scale-110 transition duration-300">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-emerald-500/30 transition duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition duration-300" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Completion Rate</span>
              <span className="text-2xl font-mono font-bold text-slate-100 tracking-tight">{taskCompletionRate}%</span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:scale-110 transition duration-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-amber-500/30 transition duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition duration-300" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Paralysis Defeated</span>
              <span className="text-2xl font-mono font-bold text-slate-100 tracking-tight">{paralysisOvercome}</span>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-110 transition duration-300">
              <BrainCircuit className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-blue-500/30 transition duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition duration-300" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Max Habit Shield</span>
              <span className="text-2xl font-mono font-bold text-slate-100 tracking-tight">{totalActiveHabitStreak}d</span>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 group-hover:scale-110 transition duration-300">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </div>
        
        {/* Left Column: Interactive workspaces */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Active Sprint Section (Hero) */}
          <AnimatePresence mode="wait">
            {selectedTaskForSprint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <FocusTimer
                  microStep={
                    selectedTaskForSprint.microSteps && activeSprintStepIndex !== -1
                      ? selectedTaskForSprint.microSteps[activeSprintStepIndex]
                      : null
                  }
                  taskTitle={selectedTaskForSprint.title}
                  onCompleteStep={handleCompleteMicroStep}
                  onClose={() => {
                    setSelectedTaskForSprint(null);
                    setActiveSprintStepIndex(-1);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dynamic Content Pane based on selected Tab */}
          <div className="space-y-6">
            
            {/* Dashboard view */}
            {activeTab === "dashboard" && (
              <DashboardView
                tasks={tasks}
                habits={habits}
                onStartSprint={handleSelectTaskFromBoard}
                onToggleTask={handleToggleComplete}
                onCompleteHabit={handleCompleteHabit}
                onResetHabit={handleResetHabit}
                onClaimGrace={handleRequestHabitGrace}
                onAddTask={(title, cat) => {
                  const t: Task = {
                    id: "task-" + Date.now(),
                    title,
                    description: "Offloaded mentally from executive dashboard.",
                    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                    durationEstimate: "25m",
                    category: cat,
                    attentionLevel: cat === "urgent-important" ? "CRITICAL" : cat === "important-not-urgent" ? "HIGH" : "MEDIUM",
                    completed: false,
                    hasDeconstructed: false,
                  };
                  setTasks((prev) => [t, ...prev]);
                  if (user) {
                    setDoc(doc(db, "tasks", t.id), { ...t, userId: user.uid }).catch(err => {
                      handleFirestoreError(err, OperationType.CREATE, `tasks/${t.id}`);
                    });
                  }
                  showToast("Mental burden successfully offloaded to planner!", "success");
                }}
                userName={user ? user.displayName : null}
                onDownloadBackup={handleDownloadBackupCSV}
              />
            )}

            {/* Planner view */}
            {activeTab === "eisenhower" && (
              <>
                {/* Task Generator controls */}
                <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 relative shadow-xl shadow-slate-950/20 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-rose-500 via-amber-500 to-transparent h-20" />
                  
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      disabled={isPrioritizing}
                      onClick={handleAutoPrioritize}
                      className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-black rounded-xl border border-amber-500/20 flex items-center gap-2 shadow-lg hover:shadow-rose-600/20 transition duration-300 disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Sparkles className={`w-4 h-4 ${isPrioritizing ? "animate-spin" : "animate-pulse"}`} />
                      <span>{isPrioritizing ? "Sorting Tasks..." : "Auto-Prioritize Tasks"}</span>
                    </button>
                  </div>

                  <h3 className="font-sans font-extrabold text-slate-100 text-md tracking-tight mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-400" />
                    Feed the Planner
                  </h3>

                  <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-semibold">
                        Task Goal / Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Complete computer science paper on generative AI"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none transition duration-200"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-semibold">
                        Deadline Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={newTaskDeadline}
                        onChange={(e) => setNewTaskDeadline(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none transition duration-200"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-semibold">
                        Estimated Hours/Duration
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 2 hours, 45 mins"
                        value={newTaskDuration}
                        onChange={(e) => setNewTaskDuration(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none transition duration-200"
                      />
                    </div>

                    <div className="md:col-span-10">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-semibold">
                        Short Context or Rough Ideas
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Must include 3 diagram layouts and references from Google Scholar"
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none transition duration-200"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition duration-200 flex items-center justify-center gap-1 shadow-md hover:shadow-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Eisenhower matrix view */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-sans font-extrabold text-white text-lg tracking-tight">
                        Eisenhower Prioritization Matrix
                      </h2>
                      <p className="text-xs text-slate-400">
                        Dynamic cognitive allocation quadrant sorting
                      </p>
                    </div>
                  </div>

                  {isPrioritizing && (
                    <div className="py-12 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center bg-slate-900/20 text-slate-400">
                      <Sparkles className="w-8 h-8 text-amber-400 animate-spin mb-3" />
                      <span className="text-sm">Sorting and analyzing your priorities via Gemini...</span>
                    </div>
                  )}

                  {!isPrioritizing && (
                    <EisenhowerMatrix
                      tasks={tasks}
                      onSelectTask={handleSelectTaskFromBoard}
                      onDeconstructTask={handleDeconstructTask}
                      onToggleComplete={handleToggleComplete}
                    />
                  )}
                </div>

                {/* Extension Requests (Crisis Panel) */}
                <div className="bg-slate-900 border border-slate-800/85 rounded-2xl p-6">
                  <h3 className="font-sans font-extrabold text-white text-md tracking-tight mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    The Emergency Deadline Extension Request
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    In absolute crisis or full ADHD freeze? Requesting an extension politely early is a sign of professionalism. Click "AI Break Down" on a task first to generate a customized template here.
                  </p>

                  <div className="space-y-4">
                    {tasks.filter(t => t.hasDeconstructed && t.extensionRequest).length === 0 ? (
                      <div className="p-4 bg-slate-950 border border-slate-800/60 text-slate-500 text-xs italic rounded-xl text-center">
                        No templates generated yet. Deconstruct tasks in your quadrant view to auto-generate customized email request drafts.
                      </div>
                    ) : (
                      tasks.filter(t => t.hasDeconstructed && t.extensionRequest).map((task) => (
                        <div key={`ext-${task.id}`} className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-300">
                              For: <span className="text-rose-400">{task.title}</span>
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(task.extensionRequest || "");
                                showToast("Copied draft email template to clipboard!", "success");
                              }}
                              className="text-[10px] font-mono px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                            >
                              Copy Draft
                            </button>
                          </div>
                          <pre className="text-xs text-slate-400 font-mono bg-slate-900/60 p-3 rounded border border-slate-900 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {task.extensionRequest}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Kickstart Drafts tab */}
            {activeTab === "drafts" && (
              <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-6">
                <div>
                  <h2 className="font-sans font-extrabold text-white text-lg tracking-tight">
                    Blank Page Defeater: Instant Starter Drafts
                  </h2>
                  <p className="text-xs text-slate-400">
                    The hardest part is starting. Let the AI generate custom structures, layouts, or skeleton letters.
                  </p>
                </div>

                <form onSubmit={handleGenerateKickstartDraft} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-semibold">
                      Starter Title or Prompt
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Essay outline on the Industrial Revolution"
                      value={draftTaskTitle}
                      onChange={(e) => setDraftTaskTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none transition duration-200"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-semibold">
                      Draft Skeleton Type
                    </label>
                    <select
                      value={draftType}
                      onChange={(e) => setDraftType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none transition duration-200"
                    >
                      <option value="outline">Comprehensive Outline</option>
                      <option value="code">Initial Code block / Skeleton</option>
                      <option value="email">Professional Email Draft</option>
                      <option value="introduction">First Paragraph / Intro Hook</option>
                      <option value="summary">High-level Summary</option>
                    </select>
                  </div>

                  <div className="md:col-span-3 flex items-end">
                    <button
                      type="submit"
                      disabled={isGeneratingDraft}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {isGeneratingDraft ? (
                        <>
                          <Sparkles className="w-4 h-4 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Generate Draft</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="md:col-span-12">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-semibold">
                      Detailed specifications or style guides (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tone should be technical, list major milestones, use standard bullet points"
                      value={draftTaskDesc}
                      onChange={(e) => setDraftTaskDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none transition duration-200"
                    />
                  </div>
                </form>

                {/* Generated result */}
                {generatedDraft && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                        <h4 className="font-sans font-bold text-slate-100 text-sm">{generatedDraft.title}</h4>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedDraft.content);
                          showToast("Copied starter draft to clipboard!", "success");
                        }}
                        className="text-[10px] font-mono px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-800 transition duration-200"
                      >
                        Copy Starter Text
                      </button>
                    </div>

                    <pre className="text-xs text-slate-400 font-mono bg-slate-900/40 p-4 rounded border border-slate-900 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[350px]">
                      {generatedDraft.content}
                    </pre>

                    {/* Pro tips from coach */}
                    <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl space-y-2">
                      <h5 className="text-[11px] font-sans font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-rose-400" />
                        Quick focus tips to edit and finalize this content:
                      </h5>
                      <ul className="list-disc pl-4 space-y-1">
                        {generatedDraft.tips.map((tip, idx) => (
                          <li key={`tip-${idx}`} className="text-xs text-slate-400 leading-relaxed">
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Habits tracker view */}
            {activeTab === "habits" && (
              <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="font-sans font-extrabold text-white text-lg tracking-tight">
                      Consistency Safeguards (Habit Trackers)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Streaks fail because of guilt from missing. Protect your streak with our AI Slip-Up Grace!
                    </p>
                  </div>

                  <form onSubmit={handleAddHabit} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="New habit title..."
                      value={newHabitTitle}
                      onChange={(e) => setNewHabitTitle(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none transition duration-200"
                    />
                    <select
                      value={newHabitFreq}
                      onChange={(e) => setNewHabitFreq(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/10 rounded-xl px-2 py-1.5 text-xs text-slate-300 outline-none transition duration-200"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition duration-200 flex items-center gap-1 shrink-0 hover:-translate-y-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>
                </div>

                {/* Habit Cards Grid */}
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {habits.map((habit) => {
                    const today = new Date().toISOString().slice(0, 10);
                    const isCompletedToday = habit.lastCompletedDate === today;

                    return (
                      <div
                        key={habit.id}
                        className="bg-slate-950/80 hover:bg-slate-950 border border-slate-800/65 p-5 rounded-2xl flex flex-col justify-between gap-5 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 relative group overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition duration-300 pointer-events-none" />
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                              {habit.frequency.toUpperCase()}
                            </span>
                            <div className="flex items-center gap-1 bg-rose-500/5 border border-rose-500/10 px-2 py-0.5 rounded-full">
                              <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
                              <span className="font-mono text-[11px] font-bold text-rose-400">
                                {habit.streak} streak
                              </span>
                            </div>
                          </div>
                          <h4 className="font-sans font-bold text-sm text-slate-100 group-hover:text-white transition">{habit.title}</h4>
                        </div>

                        <div className="space-y-3">
                          <button
                            onClick={() => handleCompleteHabit(habit.id)}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition duration-200 flex items-center justify-center gap-1.5 ${
                              isCompletedToday
                                ? "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
                                : "bg-emerald-600/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-600/25 hover:-translate-y-0.5"
                            }`}
                            disabled={isCompletedToday}
                          >
                            <Check className="w-4 h-4" />
                            <span>{isCompletedToday ? "Completed Today" : "Log Completion"}</span>
                          </button>

                          {/* Grace period triggers */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900">
                            <button
                              onClick={() => handleRequestHabitGrace(habit.id)}
                              className={`text-[10px] font-sans font-bold uppercase tracking-wider flex items-center gap-1 transition duration-200 ${
                                habit.slipUpGraceUsed
                                  ? "text-slate-700 cursor-not-allowed"
                                  : "text-amber-400 hover:text-amber-300 hover:scale-105"
                              }`}
                              disabled={habit.slipUpGraceUsed}
                              title="Claim slip-up grace to prevent streak resetting to 0"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>{habit.slipUpGraceUsed ? "Grace Claimed" : "Streak Shield"}</span>
                            </button>

                            <button
                              onClick={() => handleResetHabit(habit.id)}
                              className="text-[10px] font-sans text-slate-600 hover:text-rose-400 transition"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Study Spots find view */}
            {activeTab === "spots" && (
              <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 relative shadow-xl overflow-hidden">
                <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-emerald-500 via-blue-500 to-transparent h-20" />
                
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <h3 className="font-sans font-extrabold text-slate-100 text-md tracking-tight">
                    Panic Change of Scenery: Study Hideouts
                  </h3>
                </div>
                
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Stuck in a physical rut? Changing your location is a clinically-proven way to break executive freeze. 
                  Search for public libraries, quiet cafés, or study pods near you. Powered by <strong>Google Maps Grounding</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                  <div className="md:col-span-9">
                    <input
                      type="text"
                      placeholder="e.g. quiet study cafes, libraries with wifi and power"
                      value={studyQuery}
                      onChange={(e) => setStudyQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none transition duration-200"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <button
                      onClick={handleFindStudySpots}
                      disabled={isSearchingSpots}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition duration-200 flex items-center justify-center gap-1.5 shadow-md hover:shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {isSearchingSpots ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4" />
                          <span>Find Hideouts</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Spots results */}
                {isSearchingSpots && (
                  <div className="py-12 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center bg-slate-900/20 text-slate-400">
                    <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mb-3" />
                    <span className="text-sm font-sans font-medium">Querying nearby places with Google Maps Grounding...</span>
                  </div>
                )}

                {!isSearchingSpots && studySpotsResult && (
                  <div className="space-y-6">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Coach Recommendations</h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {studySpotsResult.text}
                      </p>
                    </div>

                    {studySpotsResult.sources && studySpotsResult.sources.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-rose-500 animate-bounce" />
                          Google Maps Direct Links (Strict Verification)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {studySpotsResult.sources.map((spot: any, i: number) => (
                            <a
                              key={`spot-link-${i}`}
                              href={spot.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/30 p-3 rounded-xl flex flex-col justify-between hover:bg-slate-900 transition duration-300 group"
                            >
                              <div className="mb-2">
                                <h5 className="text-xs font-extrabold text-slate-200 group-hover:text-emerald-400 transition">
                                  {spot.title}
                                </h5>
                                <p className="text-[10px] text-slate-500 mt-1">Google Maps Verified Place</p>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                Open in Google Maps <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition duration-200" />
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Google Drive Cloud Backup View */}
            {activeTab === "drive" && (
              <DriveBackupView
                tasks={tasks}
                habits={habits}
                driveAccessToken={driveAccessToken}
                onLinkDrive={handleGoogleSignIn}
                onRestoreData={handleRestoreData}
                showToast={showToast}
              />
            )}

          </div>

          {/* Finished/Completed Tasks Archive list */}
          {tasks.filter(t => t.completed).length > 0 && (
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6">
              <h3 className="font-sans font-extrabold text-slate-300 text-sm tracking-tight mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Conquered Tasks ({tasks.filter(t => t.completed).length})
              </h3>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {tasks.filter(t => t.completed).map((task) => (
                  <div
                    key={`archive-${task.id}`}
                    className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs text-slate-400 line-through truncate max-w-md">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-500">
                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : ""}
                      </span>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 text-slate-600 hover:text-rose-400 transition"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Coach & Action Tips */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Procrastination Coach Chat box */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex flex-col h-[520px] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500" />
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <Bot className="w-5 h-5 text-rose-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-200">Emergency Coach</h3>
                  <p className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    LIVE ANTI-FREEZE SESSIONS
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setChatMessages([
                    {
                      id: "welcome-coach",
                      role: "assistant",
                      text: "Hey! Let's get down to business. Tell me what's overwhelming you right now.",
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ]);
                }}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 border border-slate-800 px-2 py-1 rounded-lg hover:bg-slate-800 transition duration-200"
                title="Restart conversation"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Message Pane */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 max-w-[90%] ${
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl text-xs shrink-0 flex items-center justify-center border ${
                      msg.role === "user"
                        ? "bg-rose-600/10 border-rose-500/20 text-rose-400"
                        : "bg-slate-950 border-slate-800/80 text-slate-400"
                    }`}
                  >
                    {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-rose-400" />}
                  </div>

                  <div className="space-y-1 max-w-full">
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md shadow-rose-950/20 rounded-tr-none"
                          : "bg-slate-950/95 border border-slate-800/80 text-slate-200 rounded-tl-none font-medium"
                      }`}
                    >
                      {msg.text}

                      {/* Display Google Search groundings */}
                      {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-900 space-y-1">
                          <p className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                            Sources cited:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {msg.sources.map((src, idx) => (
                              <a
                                key={`src-${idx}`}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-mono bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1 hover:text-white transition"
                              >
                                <span>[{idx + 1}] {src.title.slice(0, 15)}...</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 text-right px-1">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              {isCoachTyping && (
                <div className="flex gap-2.5 max-w-[80%] mr-auto items-center">
                  <div className="p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl text-rose-400 shrink-0">
                    <Bot className="w-3.5 h-3.5 animate-bounce" />
                  </div>
                  <div className="bg-slate-950 border border-slate-800/80 px-4 py-2.5 rounded-2xl rounded-tl-none text-xs text-slate-400 italic flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-ping shrink-0" />
                    Coach is writing anti-paralysis tips...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSendChat} className="mt-4 border-t border-slate-800/60 pt-3 flex gap-2">
              <input
                type="text"
                placeholder={isListening ? "Listening... Speak your mind!" : "I am too lazy to write..."}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className={`flex-1 bg-slate-950 border focus:ring-2 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none transition duration-200 ${
                  isListening 
                    ? "border-rose-500/50 ring-2 ring-rose-500/10 placeholder-rose-400/50" 
                    : "border-slate-800 focus:border-rose-500/60 focus:ring-rose-500/10"
                }`}
              />
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center shrink-0 shadow-md ${
                  !isSpeechSupported
                    ? "opacity-40 cursor-not-allowed bg-slate-950 text-slate-600 border-slate-900"
                    : isListening
                    ? "bg-rose-500 text-white border-rose-400 animate-pulse hover:-translate-y-0.5 active:translate-y-0"
                    : "bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-rose-400 border-slate-800 hover:-translate-y-0.5 active:translate-y-0"
                }`}
                title={
                  !isSpeechSupported
                    ? "Speech dictation not supported in this browser"
                    : isListening
                    ? "Stop listening"
                    : "Dictate your frustrations"
                }
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              <button
                type="submit"
                className="p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl border border-rose-500/20 transition-all duration-200 flex items-center justify-center shrink-0 shadow-md shadow-rose-950/50 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Quick Start Focus Booster Widget */}
          <div className="bg-gradient-to-br from-slate-900 to-rose-950/20 border border-slate-850 p-5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
              <h4 className="font-sans font-bold text-slate-200 text-sm">Rapid Freeze-Breaker</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              If your task has no deconstructed steps yet, instantly launch a blank 15-minute <strong>Bionic Focus sprint</strong> to clear minor hurdles or draft emails.
            </p>
            <button
              onClick={() => {
                const blankStep: Task = {
                  id: "blank-task-sprint",
                  title: "Blank Sprint Session",
                  description: "Keep focus completely for 15 minutes. Work on whatever is stalling you.",
                  deadline: "",
                  durationEstimate: "15m",
                  category: "urgent-important",
                  attentionLevel: "LOW",
                  completed: false,
                  hasDeconstructed: true,
                  microSteps: [
                    { title: "Immediate 15-minute Sprint", durationMinutes: 15, description: "Get started immediately. Avoid any secondary tasks.", order: 1, isFirstStep: true, completed: false }
                  ]
                };
                setSelectedTaskForSprint(blankStep);
                setActiveSprintStepIndex(0);
                showToast("Bionic Sprint Launched!", "info");
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch 15m Blank Sprint</span>
            </button>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-xs text-slate-500">
            &copy; 2026 The Last-Minute Life Saver. Powered by Gemini Flash Bionic Cognitive Systems.
          </p>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">
            Aesthetic Space Grotesk layout &bull; Bionic Ticking Engine
          </p>
        </div>
      </footer>

    </div>
  );
}
