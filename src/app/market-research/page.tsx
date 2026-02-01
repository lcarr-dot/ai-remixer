"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

interface HookTrending {
  hook: string;
  example: string;
  whyWorks?: string;
  sourceUrl?: string;
  source?: string;
}

interface ContentTrending {
  topic: string;
  description: string;
  viewPotential: string;
  sourceUrl?: string;
  source?: string;
}

interface TopVideo {
  title: string;
  views: string;
  url: string;
  channel: string;
}

interface ResearchSnapshot {
  id: string;
  niche: string;
  sources: { youtube: number; reddit: number };
  hooksTrending: HookTrending[];
  contentTrending: ContentTrending[];
  hashtagsTrending: string[];
  topVideos?: TopVideo[];
  summary: string;
  createdAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface User {
  businessName: string;
  niche?: string;
}

// Simple markdown renderer
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    // Handle numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?\s*(.*)$/);
    if (numberedMatch) {
      elements.push(
        <div key={lineIndex} className="flex gap-2 mb-2">
          <span className="text-gold font-bold shrink-0">{numberedMatch[1]}.</span>
          <div>
            <span className="font-semibold text-cream">{numberedMatch[2]}</span>
            {numberedMatch[3] && <span className="text-cream/80"> {numberedMatch[3]}</span>}
          </div>
        </div>
      );
      return;
    }

    // Handle bullet points
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      const content = line.replace(/^[\s]*[\*\-]\s+/, "");
      elements.push(
        <div key={lineIndex} className="flex gap-2 mb-1 ml-2">
          <span className="text-gold">•</span>
          <span className="text-cream/90">{renderInlineMarkdown(content)}</span>
        </div>
      );
      return;
    }

    // Handle headers
    if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={lineIndex} className="font-semibold text-gold mt-3 mb-1">
          {line.replace(/\*\*/g, "")}
        </p>
      );
      return;
    }

    // Regular paragraph with inline formatting
    if (line.trim()) {
      elements.push(
        <p key={lineIndex} className="text-cream/90 mb-2">
          {renderInlineMarkdown(line)}
        </p>
      );
    }
  });

  return elements;
}

// Render inline markdown (bold, etc.)
function renderInlineMarkdown(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the bold text
    parts.push(
      <strong key={keyIndex++} className="font-semibold text-cream">
        {match[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export default function MarketResearchPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [niche, setNiche] = useState("");
  const [keywords, setKeywords] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<ResearchSnapshot | null>(null);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadLatestSnapshot();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth");
      const data = await response.json();
      if (!data.authenticated) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      if (data.user.niche) {
        setNiche(data.user.niche);
      }
    } catch {
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadLatestSnapshot = async () => {
    try {
      const response = await fetch("/api/market-research");
      const data = await response.json();
      if (data.snapshot) {
        setSnapshot(data.snapshot);
      }
    } catch {
      // No existing snapshot
    }
  };

  const handleRunResearch = async () => {
    if (!niche.trim()) {
      setError("Please enter a niche");
      return;
    }

    setIsLoading(true);
    setError("");
    setChatMessages([]); // Clear chat when running new research

    try {
      const response = await fetch("/api/market-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, keywords }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Research failed");
      }

      setSnapshot(data.snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting || !snapshot) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    
    const newUserMessage: ChatMessage = { role: "user", content: userMessage };
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsChatting(true);

    try {
      const researchContext = `
Niche: ${snapshot.niche}
Summary: ${snapshot.summary}

Trending Hooks:
${snapshot.hooksTrending?.map(h => `- ${h.hook} (Example: "${h.example}")`).join("\n") || "None"}

Trending Content:
${snapshot.contentTrending?.map(c => `- ${c.topic}: ${c.description} (${c.viewPotential} potential)`).join("\n") || "None"}

Trending Hashtags: ${snapshot.hashtagsTrending?.map(h => `#${h}`).join(" ") || "None"}
`;

      const response = await fetch("/api/market-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "chat",
          message: userMessage,
          researchContext,
          conversationHistory: chatMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setChatMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Sorry, I had trouble with that. ${err instanceof Error ? err.message : "Please try again."}` 
      }]);
    } finally {
      setIsChatting(false);
    }
  };

  const copyHashtags = () => {
    if (snapshot?.hashtagsTrending) {
      const text = snapshot.hashtagsTrending.map(h => `#${h}`).join(" ");
      navigator.clipboard.writeText(text);
      setCopiedHashtags(true);
      setTimeout(() => setCopiedHashtags(false), 2000);
    }
  };

  const suggestedQuestions = [
    "Give me 3 video ideas",
    "Best hook for beginners?",
    "Most unique angle?",
    "How to stand out?",
  ];

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

      <div className="relative z-10 flex-1 flex flex-col max-w-7xl mx-auto px-4 py-3 w-full overflow-hidden">
        <AppHeader businessName={user?.businessName} />

        {/* Header Banner */}
        <div className="bg-gold/10 border border-gold/30 rounded-lg p-2 mb-3 text-center shrink-0">
          <p className="text-sm text-gold">
            🔥 <strong>Find What&apos;s Trending</strong> — Scans YouTube & Reddit, then chat to narrow down
          </p>
        </div>

        <div className="flex-1 grid lg:grid-cols-4 gap-3 min-h-0 overflow-hidden">
          {/* Input Panel */}
          <div className="bg-surface rounded-xl border border-border/50 p-4 elegant-border flex flex-col">
            <h2 className="text-base font-semibold text-cream mb-3">🔍 Discover</h2>

            <div className="space-y-3 flex-1">
              <div>
                <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-1">
                  Niche <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Finance, Fitness, Tech..."
                  className="w-full px-3 py-2 bg-surface-light rounded-lg border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-1">
                  Keywords
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="stocks, crypto, AI..."
                  className="w-full px-3 py-2 bg-surface-light rounded-lg border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none text-sm"
                />
              </div>

              {error && (
                <div className="p-2 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-xs">
                  {error}
                </div>
              )}
            </div>

            <button
              onClick={handleRunResearch}
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-semibold uppercase tracking-wide transition-all mt-3 ${
                isLoading
                  ? "bg-gold/50 cursor-not-allowed text-forest"
                  : "bg-gradient-to-r from-gold to-gold-light hover:opacity-90 text-forest"
              }`}
            >
              {isLoading ? "Scanning..." : "🔥 Find Trends"}
            </button>

            {snapshot && (
              <p className="text-[10px] text-muted text-center mt-2">
                {snapshot.sources?.youtube || 0} YouTube • {snapshot.sources?.reddit || 0} Reddit
              </p>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 grid grid-rows-3 gap-2 min-h-0 overflow-hidden">
            {/* Hooks */}
            <div className="bg-surface rounded-xl border border-border/50 p-3 elegant-border overflow-hidden flex flex-col">
              <h3 className="text-xs font-semibold text-gold mb-2 shrink-0">🎣 HOOKS</h3>
              {!snapshot ? (
                <div className="flex-1 flex items-center justify-center text-muted text-xs">
                  Run research first
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {snapshot.hooksTrending?.map((hook, i) => (
                    <div key={i} className="p-2 bg-surface-light rounded-lg group">
                      <p className="text-xs text-cream font-medium">{hook.hook}</p>
                      <p className="text-[10px] text-gold/70 mt-0.5">&quot;{hook.example}&quot;</p>
                      {hook.sourceUrl && (
                        <a 
                          href={hook.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300 mt-1"
                        >
                          <span>{hook.source === "Reddit" ? "📱" : "▶️"}</span>
                          <span className="underline">View source</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="bg-surface rounded-xl border border-border/50 p-3 elegant-border overflow-hidden flex flex-col">
              <h3 className="text-xs font-semibold text-gold mb-2 shrink-0">📈 CONTENT</h3>
              {!snapshot ? (
                <div className="flex-1 flex items-center justify-center text-muted text-xs">
                  Run research first
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {snapshot.contentTrending?.map((content, i) => (
                    <div key={i} className="p-2 bg-surface-light rounded-lg">
                      <div className="flex items-start justify-between">
                        <p className="text-xs text-cream font-medium flex-1">{content.topic}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ml-2 shrink-0 ${
                          content.viewPotential === "High" 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {content.viewPotential}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted mt-0.5">{content.description}</p>
                      {content.sourceUrl && (
                        <a 
                          href={content.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300 mt-1"
                        >
                          <span>{content.source === "Reddit" ? "📱" : "▶️"}</span>
                          <span className="underline">View source</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hashtags */}
            <div className="bg-surface rounded-xl border border-border/50 p-3 elegant-border overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="text-xs font-semibold text-gold"># HASHTAGS</h3>
                {snapshot?.hashtagsTrending && (
                  <button
                    onClick={copyHashtags}
                    className={`text-[10px] px-2 py-0.5 rounded transition-all ${
                      copiedHashtags
                        ? "bg-green-900/30 text-green-400"
                        : "bg-surface-light text-gold/70 hover:text-gold"
                    }`}
                  >
                    {copiedHashtags ? "✓" : "Copy"}
                  </button>
                )}
              </div>
              {!snapshot ? (
                <div className="flex-1 flex items-center justify-center text-muted text-xs">
                  Run research first
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {snapshot.hashtagsTrending?.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] bg-gold/10 text-gold border border-gold/20"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Panel */}
          <div className="bg-surface rounded-xl border border-border/50 elegant-border flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="p-3 border-b border-border/30 shrink-0">
              <h3 className="text-sm font-semibold text-gold">💬 Chat</h3>
              <p className="text-[10px] text-muted">Ask to narrow down ideas</p>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {!snapshot ? (
                <div className="h-full flex items-center justify-center text-muted text-xs text-center p-4">
                  Run research first
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted text-center mb-3">Try asking:</p>
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setChatInput(q)}
                      className="w-full text-left px-3 py-2 bg-surface-light rounded-lg text-xs text-gold/70 hover:text-gold hover:bg-gold/5 transition-all border border-transparent hover:border-gold/20"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded-xl ${
                      msg.role === "user"
                        ? "bg-gold/20 p-3 ml-6"
                        : "bg-surface-light p-4 mr-2"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm text-cream">{msg.content}</p>
                    ) : (
                      <div className="text-sm space-y-1">
                        {renderMarkdown(msg.content)}
                      </div>
                    )}
                  </div>
                ))
              )}
              {isChatting && (
                <div className="p-3 bg-surface-light rounded-xl mr-2">
                  <div className="flex items-center gap-2 text-gold/60">
                    <div className="w-2 h-2 bg-gold/60 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-gold/60 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 bg-gold/60 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                    <span className="text-xs ml-1">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} className="p-3 border-t border-border/30 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={snapshot ? "Ask anything..." : "Run research first"}
                  disabled={!snapshot || isChatting}
                  className="flex-1 px-3 py-2.5 bg-surface-light rounded-lg border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none text-sm disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!snapshot || isChatting || !chatInput.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-gold to-gold-light text-forest rounded-lg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
