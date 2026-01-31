"use client";

import { useState } from "react";

type Format = "tweet" | "twitter_thread" | "linkedin" | "instagram" | "newsletter";

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
    description: "Single viral tweet",
    icon: "𝕏",
  },
  {
    id: "twitter_thread",
    label: "Thread",
    description: "Multi-tweet story",
    icon: "🧵",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "Professional post",
    icon: "in",
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Visual caption",
    icon: "📸",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    description: "Email content",
    icon: "✉️",
  },
];

export default function Home() {
  const [content, setContent] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<Format>("tweet");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

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
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full bg-pink-600/5 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-16 opacity-0 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-border/50 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted">Powered by Gemini</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            <span className="gradient-text">Content Remixer</span>
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            Transform your blog posts and writing into engaging social media content
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6 opacity-0 animate-fade-in-up stagger-1">
            <div className="bg-surface rounded-2xl border border-border/50 p-6 gradient-border">
              <label className="block text-sm font-medium text-muted mb-3">
                Your Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your blog post, article, or any content you want to remix..."
                className="w-full h-64 bg-surface-light rounded-xl p-4 text-foreground placeholder-muted/50 border border-border/30 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none transition-all"
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm text-muted">
                  {content.length.toLocaleString()} characters
                </span>
                {content && (
                  <button
                    onClick={clearAll}
                    className="text-sm text-muted hover:text-foreground transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Format Selector */}
            <div className="bg-surface rounded-2xl border border-border/50 p-6">
              <label className="block text-sm font-medium text-muted mb-4">
                Output Format
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {formats.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`relative p-4 rounded-xl border text-left transition-all group ${
                      selectedFormat === format.id
                        ? "bg-accent/10 border-accent/50 text-foreground"
                        : "bg-surface-light border-border/30 text-muted hover:border-border hover:text-foreground"
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{format.icon}</span>
                    <span className="font-medium block text-sm">{format.label}</span>
                    <span className="text-xs opacity-70">{format.description}</span>
                    {selectedFormat === format.id && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Remix Button */}
            <button
              onClick={handleRemix}
              disabled={isLoading || !content.trim()}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                isLoading
                  ? "bg-accent/50 cursor-not-allowed pulse-glow"
                  : content.trim()
                  ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
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
                  Remixing your content...
                </span>
              ) : (
                "✨ Remix Content"
              )}
            </button>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="opacity-0 animate-fade-in-up stagger-2">
            <div className="bg-surface rounded-2xl border border-border/50 p-6 h-full min-h-[500px] flex flex-col gradient-border">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-muted">
                  Remixed Content
                </label>
                {result && (
                  <button
                    onClick={copyToClipboard}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      copied
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-surface-light text-muted hover:text-foreground border border-border/30 hover:border-border"
                    }`}
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
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
                  <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                    {result}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <div className="max-w-xs">
                      <div className="text-4xl mb-4">🎨</div>
                      <p className="text-muted">
                        Your remixed content will appear here
                      </p>
                      <p className="text-sm text-muted/70 mt-2">
                        Paste your content, select a format, and click remix
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {result && (
                <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between text-sm text-muted">
                  <span>{result.length.toLocaleString()} characters</span>
                  <span className="capitalize">
                    {formats.find((f) => f.id === selectedFormat)?.label}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-muted opacity-0 animate-fade-in-up stagger-3">
          <p>Transform once, publish everywhere</p>
        </footer>
      </div>
    </div>
  );
}
