"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

interface InsightResponse {
  answer: string;
  patterns: string[];
  topPerformers: string[];
  recommendations: string[];
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
  const [videoScope, setVideoScope] = useState("all");
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
      
      // Auto-ask for patterns on load
      askQuestion("What patterns do you see in my content?");
    } catch {
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  };

  const askQuestion = async (question: string) => {
    if (isLoading) return;
    
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const question = input.trim();
    setInput("");
    await askQuestion(question);
  };

  const suggestedQuestions = [
    "What hooks are getting the most views?",
    "Which topics perform best?",
    "What patterns exist in my top videos?",
    "What should I make more of?",
    "What's working vs not working?",
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

      <div className="relative z-10 flex flex-col h-full max-w-5xl mx-auto px-4 py-3 w-full">
        <AppHeader businessName={user?.businessName} />

        {/* Chat Container */}
        <div className="flex-1 bg-surface rounded-2xl border border-border/50 elegant-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/30 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-cream">📊 Content Insights</h2>
              <select
                value={videoScope}
                onChange={(e) => setVideoScope(e.target.value)}
                className="px-3 py-1.5 bg-surface-light rounded-lg border border-border/30 text-sm text-cream focus:border-gold/50 focus:outline-none"
              >
                <option value="newest">Last 5 Videos</option>
                <option value="last10">Last 10 Videos</option>
                <option value="all">All Videos</option>
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-cream font-medium mb-2">Analyzing your content...</h3>
                <p className="text-muted text-sm">Looking for patterns in your data</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-gold/20 text-cream"
                        : "bg-surface-light text-cream"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                    {msg.insight && (
                      <div className="mt-4 space-y-4 pt-4 border-t border-border/30">
                        {/* Patterns Found */}
                        {msg.insight.patterns && msg.insight.patterns.length > 0 && (
                          <div>
                            <p className="text-xs text-gold font-semibold mb-2 uppercase tracking-wider">🔍 Patterns Found</p>
                            <ul className="space-y-1.5">
                              {msg.insight.patterns.map((pattern, j) => (
                                <li key={j} className="text-sm text-cream/90 flex items-start gap-2">
                                  <span className="text-gold">→</span>
                                  {pattern}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Top Performers */}
                        {msg.insight.topPerformers && msg.insight.topPerformers.length > 0 && (
                          <div>
                            <p className="text-xs text-green-400 font-semibold mb-2 uppercase tracking-wider">🏆 Top Performers</p>
                            <ul className="space-y-1.5">
                              {msg.insight.topPerformers.map((performer, j) => (
                                <li key={j} className="text-sm text-cream/90 flex items-start gap-2">
                                  <span className="text-green-400">★</span>
                                  {performer}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommendations */}
                        {msg.insight.recommendations && msg.insight.recommendations.length > 0 && (
                          <div>
                            <p className="text-xs text-yellow-400 font-semibold mb-2 uppercase tracking-wider">💡 Recommendations</p>
                            <ul className="space-y-1.5">
                              {msg.insight.recommendations.map((rec, j) => (
                                <li key={j} className="text-sm text-cream/90 flex items-start gap-2">
                                  <span className="text-yellow-400">•</span>
                                  {rec}
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
                    <div className="w-2 h-2 bg-gold/60 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 bg-gold/60 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                    <span className="text-xs ml-2">Analyzing your data...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          <div className="px-4 py-2 border-t border-border/20 shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(q);
                  }}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-surface rounded-lg border border-border/30 text-xs text-gold/70 hover:text-gold hover:border-gold/30 transition-all whitespace-nowrap disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-border/30 shrink-0">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your content patterns..."
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
