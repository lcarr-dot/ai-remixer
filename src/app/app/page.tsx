"use client";

import { useState, useRef, DragEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Format = "tweet" | "youtube" | "tiktok";

interface FormatOption {
  id: Format;
  label: string;
  description: string;
  icon: string;
}

interface User {
  id: string;
  email: string;
  businessName: string;
}

const formats: FormatOption[] = [
  {
    id: "tweet",
    label: "Tweet",
    description: "Viral tweet",
    icon: "𝕏",
  },
  {
    id: "youtube",
    label: "YouTube",
    description: "Hook + Script + Caption",
    icon: "▶",
  },
  {
    id: "tiktok",
    label: "TikTok",
    description: "Hook + Script + Caption",
    icon: "♪",
  },
];

export default function AppPage() {
  const [content, setContent] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<Format>("tweet");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    } catch {
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/");
  };

  const handleFileUpload = async (file: File) => {
    setError("");
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-file", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse file");
      }

      setContent(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
      setFileName("");
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleRemix = async () => {
    if (!content.trim()) {
      setError("Please enter some content to remix");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult("");

    try {
      const response = await fetch("/api/remix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          format: selectedFormat,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remix content");
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const clearAll = () => {
    setContent("");
    setResult("");
    setError("");
    setFileName("");
  };

  if (checkingAuth) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-gold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background classic-pattern flex flex-col overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col h-full max-w-5xl mx-auto px-4 py-3 w-full">
        {/* Header */}
        <header className="mb-2 shrink-0">
          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                <span className="gold-text">three seconds</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/market-research"
                className="px-3 py-1.5 rounded-lg bg-surface border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 transition-all text-xs font-medium"
              >
                🔍 Research
              </Link>
              <Link
                href="/generate-videos"
                className="px-3 py-1.5 rounded-lg bg-surface border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 transition-all text-xs font-medium"
              >
                🎬 Generate
              </Link>
              <Link
                href="/insights"
                className="px-3 py-1.5 rounded-lg bg-surface border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 transition-all text-xs font-medium"
              >
                💡 Insights
              </Link>
              <Link
                href="/storage"
                className="px-3 py-1.5 rounded-lg bg-surface border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 transition-all text-xs font-medium"
              >
                📦 Storage
              </Link>
              <span className="text-xs text-muted mx-2">|</span>
              <span className="text-xs text-muted">{user?.businessName}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-surface border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 transition-all text-xs"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-3 min-h-0">
          {/* Drop File - Top Left */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`upload-zone rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
              isDragging ? "drag-over" : ""
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <span className="text-3xl mb-2 opacity-60">📄</span>
            <p className="text-cream/80 font-medium text-sm">
              {fileName || "Drop file here"}
            </p>
            <p className="text-xs text-muted mt-1">Excel, CSV, or Text</p>
          </div>

          {/* Your Content - Top Right (spans 2 columns) */}
          <div className="col-span-2 bg-surface rounded-xl border border-border/50 p-3 flex flex-col elegant-border overflow-hidden">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <label className="text-xs font-medium text-gold/80 uppercase tracking-wider">
                Your Content
              </label>
              {content && (
                <button onClick={clearAll} className="text-xs text-gold/60 hover:text-gold">
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your content, ideas, notes, or script draft..."
              className="flex-1 w-full bg-surface-light rounded-lg p-3 text-sm text-cream placeholder-muted/50 border border-border/30 focus:border-gold/50 focus:outline-none resize-none min-h-0"
            />
            <span className="text-xs text-muted mt-2 shrink-0">{content.length.toLocaleString()} chars</span>
          </div>

          {/* Formats + Remix - Bottom Left */}
          <div className="bg-surface rounded-xl border border-border/50 p-3 flex flex-col overflow-hidden">
            <label className="text-xs font-medium text-gold/80 uppercase tracking-wider mb-2 shrink-0">
              Output Format
            </label>
            <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-auto">
              {formats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`p-2 rounded-lg border text-left transition-all flex items-center gap-3 shrink-0 ${
                    selectedFormat === format.id
                      ? "bg-gold/10 border-gold/50 text-cream"
                      : "bg-surface-light border-border/30 text-muted hover:border-gold/30"
                  }`}
                >
                  <span className="text-xl">{format.icon}</span>
                  <div>
                    <span className="text-sm font-medium block">{format.label}</span>
                    <span className="text-xs opacity-70">{format.description}</span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={handleRemix}
              disabled={isLoading || !content.trim()}
              className={`mt-2 w-full py-2.5 rounded-lg font-semibold text-sm transition-all uppercase tracking-wide shrink-0 ${
                isLoading
                  ? "bg-gold/50 cursor-not-allowed text-forest"
                  : content.trim()
                  ? "bg-gradient-to-r from-gold to-gold-light hover:opacity-90 text-forest"
                  : "bg-surface-light text-muted cursor-not-allowed"
              }`}
            >
              {isLoading ? "Remixing..." : "✦ Remix"}
            </button>
            {error && (
              <div className="mt-2 p-2 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-xs shrink-0">
                {error}
              </div>
            )}
          </div>

          {/* Output - Bottom Right (spans 2 columns) */}
          <div className="col-span-2 bg-surface rounded-xl border border-border/50 p-3 flex flex-col elegant-border overflow-hidden">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <label className="text-xs font-medium text-gold/80 uppercase tracking-wider">
                Output
              </label>
              {result && (
                <button
                  onClick={copyToClipboard}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                    copied
                      ? "bg-green-900/30 text-green-400"
                      : "bg-surface-light text-gold/70 hover:text-gold"
                  }`}
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              )}
            </div>

            <div className="flex-1 bg-surface-light rounded-lg p-3 border border-border/30 overflow-auto min-h-0">
              {result ? (
                <div className="whitespace-pre-wrap text-cream text-sm leading-relaxed break-words">
                  {result}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <div className="text-2xl mb-2 opacity-40">✦</div>
                    <p className="text-muted text-sm">Output appears here</p>
                  </div>
                </div>
              )}
            </div>

            {result && (
              <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted shrink-0">
                <span>{result.length.toLocaleString()} chars</span>
                <span className="text-gold/60">
                  {formats.find((f) => f.id === selectedFormat)?.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-1 shrink-0">
          <p className="tracking-widest uppercase text-gold/30 text-xs">three seconds</p>
        </footer>
      </div>
    </div>
  );
}
