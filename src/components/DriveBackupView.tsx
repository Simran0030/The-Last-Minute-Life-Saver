import React, { useState, useEffect } from "react";
import {
  Cloud,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Database,
  Calendar,
  AlertCircle
} from "lucide-react";
import { Task, HabitGoal } from "../types";

interface DriveBackupViewProps {
  tasks: Task[];
  habits: HabitGoal[];
  driveAccessToken: string | null;
  onLinkDrive: () => Promise<void>;
  onRestoreData: (tasks: Task[], habits: HabitGoal[]) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
}

export default function DriveBackupView({
  tasks,
  habits,
  driveAccessToken,
  onLinkDrive,
  onRestoreData,
  showToast
}: DriveBackupViewProps) {
  const [backups, setBackups] = useState<DriveBackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackupCreating, setIsBackupCreating] = useState(false);
  const [actionFileId, setActionFileId] = useState<string | null>(null);

  // Load backups when access token is available
  useEffect(() => {
    if (driveAccessToken) {
      fetchBackups();
    }
  }, [driveAccessToken]);

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const q = encodeURIComponent("name contains 'executive_planner_backup' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime+desc&fields=files(id,name,mimeType,createdTime)`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${driveAccessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to list files: ${res.statusText}`);
      }

      const data = await res.json();
      setBackups(data.files || []);
    } catch (err: any) {
      console.error("Error fetching backups:", err);
      showToast("Could not retrieve backups from Google Drive.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!driveAccessToken) {
      showToast("Please connect to Google Drive first.", "info");
      return;
    }

    setIsBackupCreating(true);
    try {
      const backupData = {
        app: "the-last-minute-life-saver",
        version: "1.0",
        timestamp: new Date().toISOString(),
        tasks,
        habits,
      };

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `executive_planner_backup_${dateStr}.json`;

      // 1. Create Metadata to get fileId
      const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${driveAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: filename,
          mimeType: "application/json",
        }),
      });

      if (!createRes.ok) {
        throw new Error("Failed to create file metadata in Google Drive.");
      }

      const fileData = await createRes.json();
      const fileId = fileData.id;

      // 2. Upload raw media content
      const uploadRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${driveAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(backupData),
        }
      );

      if (!uploadRes.ok) {
        throw new Error("Failed to write backup content to Google Drive.");
      }

      showToast(`Backup saved securely as ${filename}!`, "success");
      fetchBackups();
    } catch (err: any) {
      console.error("Error creating backup:", err);
      showToast(err.message || "Failed to create cloud backup.", "error");
    } finally {
      setIsBackupCreating(false);
    }
  };

  const handleRestoreBackup = async (file: DriveBackupFile) => {
    const confirmed = window.confirm(
      `WARNING: Restoring the backup "${file.name}" will completely overwrite all your current tasks and habits. Are you absolutely sure you want to proceed?`
    );

    if (!confirmed) return;

    setActionFileId(file.id);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: {
          Authorization: `Bearer ${driveAccessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Could not download backup file content.");
      }

      const backupContent = await res.json();
      
      // Basic schema validation
      if (!backupContent || (!Array.isArray(backupContent.tasks) && !Array.isArray(backupContent.habits))) {
        throw new Error("Invalid backup file format.");
      }

      const restoredTasks = Array.isArray(backupContent.tasks) ? backupContent.tasks : [];
      const restoredHabits = Array.isArray(backupContent.habits) ? backupContent.habits : [];

      onRestoreData(restoredTasks, restoredHabits);
      showToast(`Successfully restored ${restoredTasks.length} tasks and ${restoredHabits.length} habits!`, "success");
    } catch (err: any) {
      console.error("Error restoring backup:", err);
      showToast(err.message || "Failed to restore cloud backup.", "error");
    } finally {
      setActionFileId(null);
    }
  };

  const handleDeleteBackup = async (file: DriveBackupFile) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the backup file "${file.name}" from your Google Drive? This action is permanent.`
    );

    if (!confirmed) return;

    setActionFileId(file.id);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${driveAccessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Could not delete backup file.");
      }

      showToast("Backup deleted successfully from Drive.", "success");
      setBackups((prev) => prev.filter((b) => b.id !== file.id));
    } catch (err: any) {
      console.error("Error deleting backup:", err);
      showToast(err.message || "Failed to delete backup file.", "error");
    } finally {
      setActionFileId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 bg-slate-950/40 rounded-3xl border border-slate-800/40 shadow-xl" id="drive-backup-panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Cloud className="w-6 h-6 text-sky-400" />
            <span>Google Drive Cloud Sync</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Securely back up your executive planners, routines, and sprint tasks to your personal Google Drive account.
          </p>
        </div>

        {driveAccessToken && (
          <button
            onClick={handleCreateBackup}
            disabled={isBackupCreating}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white border border-sky-500/20 px-4 py-2.5 rounded-2xl font-bold text-xs transition duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isBackupCreating ? (
              <RefreshCw className="w-4 h-4 text-sky-300 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4 text-sky-300" />
            )}
            <span>Create New Backup</span>
          </button>
        )}
      </div>

      {/* Connection Panel */}
      {!driveAccessToken ? (
        <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-slate-950/60 border border-slate-900 rounded-2xl">
          <div className="p-3 bg-slate-900 rounded-full border border-slate-800 text-slate-400 mb-4 animate-bounce">
            <Lock className="w-7 h-7 text-sky-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">Google Drive Authorization Required</h3>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md">
            To prevent data loss and support recovery, authorize secure access to your Google Drive. 
            All backup data remains in your personal workspace under strict isolation.
          </p>

          <button
            onClick={onLinkDrive}
            className="gsi-material-button mt-6 shadow-lg shadow-sky-950/30"
            id="drive-connect-btn"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents font-sans font-bold">Connect Google Drive</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connection status banner */}
          <div className="flex items-center justify-between p-3.5 bg-emerald-950/20 border border-emerald-500/10 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-200 block">Cloud Storage Synced Successfully</span>
                <span className="text-[10px] text-slate-400 font-mono">Isolated App Folder Active</span>
              </div>
            </div>
            <button
              onClick={fetchBackups}
              disabled={isLoading}
              className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 rounded-xl text-slate-400 hover:text-slate-200 transition"
              title="Refresh backups list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>

          {/* Backup list container */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">Stored Backup Files</h3>
            
            {isLoading && backups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-400 mb-2" />
                <span className="text-xs font-mono">Scanning cloud storage...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-950/20 border border-slate-900/60 rounded-2xl">
                <Database className="w-8 h-8 text-slate-600 mb-2" />
                <span className="text-xs text-slate-400 font-medium">No previous backups detected on Google Drive</span>
                <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                  Click the "Create New Backup" button above to upload your current planner configuration.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {backups.map((file) => {
                  const isProcessing = actionFileId === file.id;
                  const formattedDate = new Date(file.createdTime).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });

                  return (
                    <div
                      key={file.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950/50 border border-slate-900 hover:border-slate-800 rounded-2xl gap-4 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-sky-950/30 rounded-xl border border-sky-500/10 text-sky-400">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-200 block truncate max-w-xs sm:max-w-md">
                            {file.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-mono">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Created: {formattedDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleRestoreBackup(file)}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-sky-500/20 hover:bg-sky-950/20 text-slate-300 hover:text-sky-400 rounded-xl font-bold text-[10px] uppercase tracking-wide transition disabled:opacity-50"
                          title="Restore this backup to the planner"
                        >
                          {isProcessing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <DownloadCloud className="w-3.5 h-3.5" />
                          )}
                          <span>Restore</span>
                        </button>

                        <button
                          onClick={() => handleDeleteBackup(file)}
                          disabled={isProcessing}
                          className="p-1.5 bg-slate-900 border border-slate-800 hover:border-rose-500/20 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded-xl transition disabled:opacity-50"
                          title="Delete backup permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Information / Scope Guard disclaimer footer */}
      <div className="p-4 bg-slate-950/80 border border-slate-900 rounded-2xl flex items-start gap-3 mt-4">
        <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-400 leading-relaxed">
          <span className="font-bold text-slate-300 block mb-0.5">Privacy & Security Guard</span>
          This workspace complies with the Google OAuth **Scope Minimization (Least Privilege)** standard. 
          By requesting `drive.file` permissions, this application is strictly isolated: it can only read, write, or list backup files **that were created specifically by this app**. 
          It has absolute zero access to any other files or folders in your Google Drive.
        </div>
      </div>
    </div>
  );
}
