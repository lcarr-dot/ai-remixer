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
    description: "Hook + Caption",
    icon: "▶",
  },
  {
    id: "tiktok",
    label: "TikTok",
    description: "Hook + Caption",
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
    <div className="min-h-screen bg-background classic-pattern">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-16 opacity-0 animate-fade-in-up">
          {/* Admin Button */}
          <div className="flex justify-end mb-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 transition-all text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Knowledge Base
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-gold/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-sm text-gold/80 tracking-widest uppercase">Investment Content</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            <span className="gold-text">GGinvestments</span>
            <span className="text-cream/90 font-light"> Remixer</span>
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto font-light tracking-wide">
            Transform your investment insights into viral social content
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6 opacity-0 animate-fade-in-up stagger-1">
            {/* File Upload Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`upload-zone rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging ? "drag-over" : ""
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-4xl mb-3 opacity-60">📄</div>
              <p className="text-cream/80 font-medium mb-1">
                {fileName || "Drop your file here"}
              </p>
              <p className="text-sm text-muted">
                PDF, Excel, CSV, or Text files
              </p>
            </div>

            {/* Text Input */}
            <div className="bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
              <label className="block text-sm font-medium text-gold/80 mb-3 uppercase tracking-wider">
                Your Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your investment content, research notes, or market analysis..."
                className="w-full h-48 bg-surface-light rounded-xl p-4 text-cream placeholder-muted/50 border border-border/30 focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/20 resize-none transition-all"
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm text-muted">
                  {content.length.toLocaleString()} characters
                </span>
                {content && (
                  <button
                    onClick={clearAll}
                    className="text-sm text-gold/60 hover:text-gold transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Format Selector */}
            <div className="bg-surface rounded-2xl border border-border/50 p-6">
              <label className="block text-sm font-medium text-gold/80 mb-4 uppercase tracking-wider">
                Output Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                {formats.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`relative p-4 rounded-xl border text-center transition-all group ${
                      selectedFormat === format.id
                        ? "bg-gold/10 border-gold/50 text-cream"
                        : "bg-surface-light border-border/30 text-muted hover:border-gold/30 hover:text-cream"
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{format.icon}</span>
                    <span className="font-medium block text-sm">{format.label}</span>
                    <span className="text-xs opacity-70">{format.description}</span>
                    {selectedFormat === format.id && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Remix Button */}
            <button
              onClick={handleRemix}
              disabled={isLoading || !content.trim()}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all uppercase tracking-wider ${
                isLoading
                  ? "bg-gold/50 cursor-not-allowed pulse-gold text-forest"
                  : content.trim()
                  ? "bg-gradient-to-r from-gold via-gold-light to-gold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] text-forest"
                  : "bg-surface-light text-muted cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Crafting your content...
                </span>
              ) : (
                "✦ Remix Content"
              )}
            </button>

            {error && (
              <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="opacity-0 animate-fade-in-up stagger-2">
            <div className="bg-surface rounded-2xl border border-border/50 p-6 h-full min-h-[500px] flex flex-col elegant-border">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gold/80 uppercase tracking-wider">
                  Remixed Content
                </label>
                {result && (
                  <button
                    onClick={copyToClipboard}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      copied
                        ? "bg-green-900/30 text-green-400 border border-green-500/30"
                        : "bg-surface-light text-gold/70 hover:text-gold border border-gold/20 hover:border-gold/40"
                    }`}
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex-1 bg-surface-light rounded-xl p-4 border border-border/30 overflow-auto">
                {result ? (
                  <div className="whitespace-pre-wrap text-cream leading-relaxed">
                    {result}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <div className="max-w-xs">
                      <div className="text-4xl mb-4 opacity-40">✦</div>
                      <p className="text-muted font-light">
                        Your remixed content will appear here
                      </p>
                      <p className="text-sm text-muted/70 mt-2">
                        Upload a file or paste content to begin
          </p>
        </div>
                  </div>
                )}
              </div>

              {result && (
                <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between text-sm text-muted">
                  <span>{result.length.toLocaleString()} characters</span>
                  <span className="text-gold/60">
                    {formats.find((f) => f.id === selectedFormat)?.label}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-muted opacity-0 animate-fade-in-up stagger-3">
          <p className="tracking-widest uppercase text-gold/40">GGinvestments</p>
        </footer>
      </div>
    </div>
  );
}
