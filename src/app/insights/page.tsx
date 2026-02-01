"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

interface InsightResponse {
  answer: string;
  confidenceScore: number;
  recommendedActions: string[];
  missingDataRequests: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  insight?: InsightResponse;
}

interface User {
  businessName: string;
}

export default function InsightsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [videoScope, setVideoScope] = useState("last10");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          videoScope,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get insights");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.insight.answer,
          insight: data.insight,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "What content is performing best?",
    "What hooks are working for me?",
    "How can I improve my retention?",
    "What topics should I explore next?",
    "What's my best posting time?",
  ];

  if (checkingAuth) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-gold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background classic-pattern flex flex-col overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col h-full max-w-4xl mx-auto px-6 py-6 w-full">
        <AppHeader businessName={user?.businessName} />

        {/* Banner */}
        <div className="bg-gold/10 border border-gold/30 rounded-xl p-3 mb-4 text-center shrink-0">
          <p className="text-sm text-gold">
            💡 For best insights, log <strong>YouTube + TikTok</strong> data first. Add other platforms when you can.
          </p>
        </div>

        {/* Chat Container */}
        <div className="flex-1 bg-surface rounded-2xl border border-border/50 elegant-border flex flex-col overflow-hidden">
          {/* Video Scope Selector */}
          <div className="p-4 border-b border-border/30 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-cream">💡 Ask About Your Content</h2>
              <select
                value={videoScope}
                onChange={(e) => setVideoScope(e.target.value)}
                className="px-3 py-1.5 bg-surface-light rounded-lg border border-border/30 text-sm text-cream focus:border-gold/50 focus:outline-none"
              >
                <option value="newest">Newest Video</option>
                <option value="last10">Last 10 Videos</option>
                <option value="all">All Videos</option>
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-cream font-medium mb-2">Ask me anything about your content</h3>
                <p className="text-muted text-sm mb-6">
                  I&apos;ll analyze your performance and give actionable insights
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(q)}
                      className="px-3 py-1.5 bg-surface-light rounded-lg border border-border/30 text-xs text-gold/70 hover:text-gold hover:border-gold/30 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-gold/20 text-cream"
                        : "bg-surface-light text-cream"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                    {msg.insight && (
                      <div className="mt-4 space-y-3 pt-3 border-t border-border/30">
                        {/* Confidence */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">Confidence:</span>
                          <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gold"
                              style={{ width: `${msg.insight.confidenceScore}%` }}
                            />
                          </div>
                          <span className="text-xs text-gold">{msg.insight.confidenceScore}%</span>
                        </div>

                        {/* Recommended Actions */}
                        {msg.insight.recommendedActions.length > 0 && (
                          <div>
                            <p className="text-xs text-green-400 font-medium mb-1">✅ Recommended Actions:</p>
                            <ul className="space-y-1">
                              {msg.insight.recommendedActions.map((action, j) => (
                                <li key={j} className="text-xs text-cream/80 flex items-start gap-2">
                                  <span className="text-green-400/60">•</span>
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Missing Data */}
                        {msg.insight.missingDataRequests.length > 0 && (
                          <div>
                            <p className="text-xs text-yellow-400 font-medium mb-1">⚠️ Missing Data:</p>
                            <ul className="space-y-1">
                              {msg.insight.missingDataRequests.map((req, j) => (
                                <li key={j} className="text-xs text-cream/80 flex items-start gap-2">
                                  <span className="text-yellow-400/60">•</span>
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-light p-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-gold/60">
                    <div className="w-2 h-2 bg-gold/60 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-gold/60 rounded-full animate-pulse delay-100" />
                    <div className="w-2 h-2 bg-gold/60 rounded-full animate-pulse delay-200" />
                    <span className="text-xs ml-2">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-border/30 shrink-0">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your content performance..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-forest rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ask
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
