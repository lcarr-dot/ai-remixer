"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface VideoEntry {
  id: string;
  title?: string;
  platform?: string;
  hook?: string;
  description?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  duration?: number;
  avgWatchTime?: number;
  postedAt?: string;
  createdAt: string;
  type: string;
}

interface MissingGap {
  field: string;
  count: number;
  videoIds: string[];
}

interface User {
  businessName: string;
}

// Helper to format duration in seconds to MM:SS or HH:MM:SS
function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Helper to format dates nicely
function formatDate(dateStr: string): string {
  // Handle various date formats
  if (!dateStr) return "-";
  
  // If it's already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-");
    return `${month}/${day}/${year}`;
  }
  
  // Try to parse as date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString();
  }
  
  return dateStr;
}

export default function StoragePage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [entries, setEntries] = useState<VideoEntry[]>([]);
  const [missingGaps, setMissingGaps] = useState<MissingGap[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logText, setLogText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth");
      const data = await response.json();
      if (!data.authenticated) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      loadEntries();
    } catch {
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadEntries = async () => {
    try {
      const response = await fetch("/api/storage");
      const data = await response.json();
      setEntries(data.entries || []);
      calculateMissingGaps(data.entries || []);
    } catch {
      // No entries yet
    }
  };

  const calculateMissingGaps = (entries: VideoEntry[]) => {
    const gaps: Record<string, { count: number; videoIds: string[] }> = {
      "Title": { count: 0, videoIds: [] },
      "Views": { count: 0, videoIds: [] },
      "Likes": { count: 0, videoIds: [] },
      "Comments": { count: 0, videoIds: [] },
      "Duration": { count: 0, videoIds: [] },
      "Post Date": { count: 0, videoIds: [] },
    };

    entries.forEach((entry) => {
      if (!entry.title) {
        gaps["Title"].count++;
        gaps["Title"].videoIds.push(entry.id);
      }
      if (entry.views === undefined) {
        gaps["Views"].count++;
        gaps["Views"].videoIds.push(entry.id);
      }
      if (entry.likes === undefined) {
        gaps["Likes"].count++;
        gaps["Likes"].videoIds.push(entry.id);
      }
      if (entry.comments === undefined) {
        gaps["Comments"].count++;
        gaps["Comments"].videoIds.push(entry.id);
      }
      if (entry.duration === undefined) {
        gaps["Duration"].count++;
        gaps["Duration"].videoIds.push(entry.id);
      }
      if (!entry.postedAt) {
        gaps["Post Date"].count++;
        gaps["Post Date"].videoIds.push(entry.id);
      }
    });

    const gapList = Object.entries(gaps)
      .filter(([, v]) => v.count > 0)
      .map(([field, v]) => ({ field, ...v }))
      .sort((a, b) => b.count - a.count);

    setMissingGaps(gapList);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/storage", {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setSuccess(`Imported ${data.imported || 0} entries from ${file.name}`);
      setTimeout(() => setSuccess(""), 3000);
      loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogSubmit = async () => {
    if (!logText.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text_log",
          text: logText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to log entry");
      }

      setLogText("");
      setSuccess("Entry logged successfully!");
      setTimeout(() => setSuccess(""), 3000);
      loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log entry");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Check if browser supports speech recognition
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        setError("Voice not supported. Please use Chrome or Edge browser.");
        return;
      }

      // Start recording
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false; // Stop after one phrase for simplicity
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setLogText((prev) => prev ? prev + " " + transcript : transcript);
        setSuccess("Got it! Click 'Log Text' to save.");
        setTimeout(() => setSuccess(""), 3000);
      };

      recognition.onerror = (event: Event & { error?: string }) => {
        const errorType = event.error || "unknown";
        if (errorType === "not-allowed") {
          setError("Microphone access denied. Please allow microphone in browser settings.");
        } else if (errorType === "no-speech") {
          setError("No speech detected. Click Voice and try speaking.");
        } else if (errorType === "network") {
          setError("Network error. Check your internet connection.");
        } else {
          setError(`Voice error: ${errorType}. Try Chrome browser.`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      
      try {
        recognition.start();
        setIsRecording(true);
        setError("");
        setSuccess("🎤 Listening... Speak now!");
      } catch (err) {
        setError("Could not start voice. Please use Chrome or Edge.");
        setIsRecording(false);
      }
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (filter === "all") return true;
    if (filter === "missing_views") return !entry.views;
    if (filter === "missing_hook") return !entry.hook;
    if (filter === "youtube") return entry.platform === "youtube";
    if (filter === "tiktok") return entry.platform === "tiktok";
    return true;
  });

  if (checkingAuth) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-gold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background classic-pattern overflow-hidden flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-6xl mx-auto px-4 py-3 w-full overflow-hidden">
        <AppHeader businessName={user?.businessName} />

        {/* Banner */}
        <div className="bg-gold/10 border border-gold/30 rounded-lg p-2 mb-3 text-center shrink-0">
          <p className="text-xs text-gold">
            📦 For best results, log <strong>YouTube + TikTok</strong> data first.
          </p>
        </div>

        <div className="flex-1 grid lg:grid-cols-3 gap-4 min-h-0 overflow-hidden">
          {/* Input Panel */}
          <div className="space-y-3 overflow-auto">
            {/* File Upload */}
            <div className="bg-surface rounded-xl border border-border/50 p-4 elegant-border">
              <h3 className="text-sm font-semibold text-gold mb-2">📁 Import File</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt,.json,.html"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full py-4 rounded-xl border-2 border-dashed border-border/50 hover:border-gold/50 text-muted hover:text-gold transition-all text-sm"
              >
                {isLoading ? "Uploading..." : "Drop or click to upload\nCSV, XLSX, TXT, JSON, HTML"}
              </button>
            </div>

            {/* Text/Voice Log */}
            <div className="bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
              <h3 className="text-sm font-semibold text-gold mb-4">💬 Tell the AI</h3>
              <textarea
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Tell me about your latest video... e.g., 'My TikTok about stocks got 12k views and 500 likes'"
                rows={4}
                className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none resize-none text-sm mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleLogSubmit}
                  disabled={isLoading || !logText.trim()}
                  className="flex-1 py-2 rounded-lg bg-gold/10 border border-gold/30 text-gold text-sm font-medium hover:bg-gold/20 transition-all disabled:opacity-50"
                >
                  📝 Log Text
                </button>
                <button
                  onClick={handleVoiceRecord}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isRecording
                      ? "bg-red-500/20 border-red-500/50 text-red-400"
                      : "bg-surface-light border-border/30 text-gold/70 hover:text-gold hover:border-gold/30"
                  }`}
                >
                  {isRecording ? "⏹ Stop" : "🎤 Voice"}
                </button>
              </div>
            </div>

            {/* Missing Data Panel */}
            {missingGaps.length > 0 && (
              <div className="bg-yellow-900/10 border border-yellow-500/30 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-yellow-400 mb-4">⚠️ Missing Data</h3>
                <ul className="space-y-2">
                  {missingGaps.slice(0, 5).map((gap, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-cream/80">{gap.field}</span>
                      <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                        {gap.count} missing
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Spreadsheet View */}
          <div className="lg:col-span-2 bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-cream">📊 Content Tracker</h3>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-1.5 bg-surface-light rounded-lg border border-border/30 text-sm text-cream focus:border-gold/50 focus:outline-none"
              >
                <option value="all">All Entries</option>
                <option value="missing_views">Missing Views</option>
                <option value="missing_hook">Missing Hook</option>
                <option value="youtube">YouTube Only</option>
                <option value="tiktok">TikTok Only</option>
              </select>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-500/30 text-green-400 text-sm">
                {success}
              </div>
            )}

            {filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3 opacity-40">📊</div>
                <p className="text-muted mb-2">No data logged yet</p>
                <p className="text-xs text-muted">Upload a file or tell the AI about your videos</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-2 text-gold/80 font-medium">Title</th>
                      <th className="text-left py-2 px-2 text-gold/80 font-medium">Platform</th>
                      <th className="text-right py-2 px-2 text-gold/80 font-medium">Views</th>
                      <th className="text-right py-2 px-2 text-gold/80 font-medium">Likes</th>
                      <th className="text-right py-2 px-2 text-gold/80 font-medium">Comments</th>
                      <th className="text-right py-2 px-2 text-gold/80 font-medium">Duration</th>
                      <th className="text-right py-2 px-2 text-gold/80 font-medium">Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-border/20 hover:bg-surface-light/50">
                        <td className="py-2 px-2 text-cream/90 max-w-[180px] truncate" title={entry.title}>
                          {entry.title || <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px]">Missing</span>}
                        </td>
                        <td className="py-2 px-2 text-cream/70 capitalize">{entry.platform || "-"}</td>
                        <td className="py-2 px-2 text-right">
                          {entry.views !== undefined ? (
                            <span className="text-cream">{entry.views.toLocaleString()}</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px]">Missing</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {entry.likes !== undefined ? (
                            <span className="text-cream">{entry.likes.toLocaleString()}</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px]">Missing</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {entry.comments !== undefined ? (
                            <span className="text-cream">{entry.comments.toLocaleString()}</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px]">Missing</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-cream/70">
                          {entry.duration ? formatDuration(entry.duration) : "-"}
                        </td>
                        <td className="py-2 px-2 text-right text-cream/70">
                          {entry.postedAt ? formatDate(entry.postedAt) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {entries.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
                <span className="text-xs text-muted">
                  {filteredEntries.length} of {entries.length} entries
                </span>
                <button
                  onClick={() => {
                    // Export CSV functionality
                    const csv = [
                      ["Title", "Platform", "Views", "Likes", "Comments", "Shares", "Duration", "Posted", "Hook", "Description"],
                      ...entries.map((e) => [
                        e.title || "",
                        e.platform || "",
                        e.views?.toString() || "",
                        e.likes?.toString() || "",
                        e.comments?.toString() || "",
                        e.shares?.toString() || "",
                        e.duration ? formatDuration(e.duration) : "",
                        e.postedAt || "",
                        e.hook || "",
                        e.description || "",
                      ]),
                    ]
                      .map((row) => row.map(cell => `"${cell}"`).join(","))
                      .join("\n");

                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "three-seconds-export.csv";
                    a.click();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-surface-light border border-border/30 text-gold/70 text-xs hover:text-gold hover:border-gold/30 transition-all"
                >
                  📥 Export CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
