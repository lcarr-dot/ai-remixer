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
  if (!dateStr) return "-";
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-");
    return `${month}/${day}/${year}`;
  }
  
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
  const [totalMissing, setTotalMissing] = useState(0);
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
      calculateMissing(data.entries || []);
    } catch {
      // No entries yet
    }
  };

  const calculateMissing = (entries: VideoEntry[]) => {
    let count = 0;
    entries.forEach((entry) => {
      if (entry.likes === undefined) count++;
      if (entry.comments === undefined) count++;
    });
    setTotalMissing(count);
  };

  // Export Excel with highlighted gaps
  const handleFixNow = () => {
    // Create CSV with MISSING markers that Excel will show
    const headers = ["Title", "Platform", "Views", "Likes", "Comments", "Duration", "Posted"];
    const rows = entries.map((e) => [
      e.title || "MISSING",
      e.platform || "-",
      e.views !== undefined ? e.views.toString() : "",
      e.likes !== undefined ? e.likes.toString() : "⚠️ FILL IN",
      e.comments !== undefined ? e.comments.toString() : "⚠️ FILL IN",
      e.duration ? formatDuration(e.duration) : "",
      e.postedAt || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "three-seconds-fix-gaps.csv";
    a.click();
    URL.revokeObjectURL(url);
    
    setSuccess("Downloaded! Open in Excel, fill in the ⚠️ cells, then re-import.");
    setTimeout(() => setSuccess(""), 5000);
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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        setError("Voice not supported. Please use Chrome or Edge browser.");
        return;
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
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
      } catch {
        setError("Could not start voice. Please use Chrome or Edge.");
        setIsRecording(false);
      }
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (filter === "all") return true;
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

        {/* Missing Data Alert - Only show when there's missing data */}
        {totalMissing > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-500/40 rounded-lg p-3 mb-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-lg">⚠️</span>
              <span className="text-yellow-200 text-sm">
                Analytics missing in your data ({totalMissing} gaps)
              </span>
            </div>
            <button
              onClick={handleFixNow}
              className="px-4 py-1.5 rounded-lg bg-yellow-500 text-black text-sm font-semibold hover:bg-yellow-400 transition-all"
            >
              Fix Now →
            </button>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm shrink-0">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 rounded-lg bg-green-900/20 border border-green-500/30 text-green-400 text-sm shrink-0">
            {success}
          </div>
        )}

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
                {isLoading ? "Uploading..." : "Drop or click to upload\nCSV, XLSX, TXT, JSON"}
              </button>
            </div>

            {/* Text/Voice Log */}
            <div className="bg-surface rounded-2xl border border-border/50 p-4 elegant-border">
              <h3 className="text-sm font-semibold text-gold mb-3">💬 Tell the AI</h3>
              <textarea
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Tell me about your latest video... e.g., 'My TikTok about stocks got 12k views and 500 likes'"
                rows={3}
                className="w-full px-3 py-2 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none resize-none text-sm mb-3"
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
          </div>

          {/* Spreadsheet View */}
          <div className="lg:col-span-2 bg-surface rounded-2xl border border-border/50 p-4 elegant-border flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-lg font-semibold text-cream">📊 Content Tracker</h3>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-1.5 bg-surface-light rounded-lg border border-border/30 text-sm text-cream focus:border-gold/50 focus:outline-none"
              >
                <option value="all">All Entries</option>
                <option value="youtube">YouTube Only</option>
                <option value="tiktok">TikTok Only</option>
              </select>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="text-center py-12 flex-1 flex flex-col items-center justify-center">
                <div className="text-4xl mb-3 opacity-40">📊</div>
                <p className="text-muted mb-2">No data logged yet</p>
                <p className="text-xs text-muted">Upload a file or tell the AI about your videos</p>
              </div>
            ) : (
              <div className="overflow-auto flex-1">
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
                          {entry.title || "-"}
                        </td>
                        <td className="py-2 px-2 text-cream/70 capitalize">{entry.platform || "-"}</td>
                        <td className="py-2 px-2 text-right text-cream">
                          {entry.views !== undefined ? entry.views.toLocaleString() : "-"}
                        </td>
                        <td className="py-2 px-2 text-right text-cream">
                          {entry.likes !== undefined ? entry.likes.toLocaleString() : "-"}
                        </td>
                        <td className="py-2 px-2 text-right text-cream">
                          {entry.comments !== undefined ? entry.comments.toLocaleString() : "-"}
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
              <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between shrink-0">
                <span className="text-xs text-muted">
                  {filteredEntries.length} of {entries.length} entries
                </span>
                <button
                  onClick={() => {
                    const csv = [
                      ["Title", "Platform", "Views", "Likes", "Comments", "Duration", "Posted"],
                      ...entries.map((e) => [
                        e.title || "",
                        e.platform || "",
                        e.views?.toString() || "",
                        e.likes?.toString() || "",
                        e.comments?.toString() || "",
                        e.duration ? formatDuration(e.duration) : "",
                        e.postedAt || "",
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
                    URL.revokeObjectURL(url);
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
