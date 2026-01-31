"use client";

import { useState, useRef, DragEvent } from "react";
import Link from "next/link";

type Format = "tweet" | "youtube" | "tiktok";

interface FormatOption {
  id: Format;
  label: string;
  description: string;
  icon: string;
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

export default function Home() {
  const [content, setContent] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<Format>("tweet");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="h-screen bg-background classic-pattern flex flex-col overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col h-full max-w-5xl mx-auto px-4 py-3 w-full">
        {/* Header */}
        <header className="text-center mb-2 shrink-0">
          {/* Navigation Buttons */}
          <div className="flex justify-end gap-2 mb-2">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 transition-all text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Dashboard
            </Link>
            <Link href="/socials" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 transition-all text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Socials
            </Link>
            <Link href="/admin" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 transition-all text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Knowledge Base
            </Link>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            <span className="gold-text">GGinvestments</span>
            <span className="text-cream/90 font-light"> Remixer</span>
          </h1>
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
              placeholder="Paste your investment content, research notes, or market analysis..."
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
          <p className="tracking-widest uppercase text-gold/30 text-xs">GGinvestments</p>
        </footer>
      </div>
    </div>
  );
}
