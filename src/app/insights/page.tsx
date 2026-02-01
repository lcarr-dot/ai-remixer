"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

interface Message {
  role: "user" | "assistant";
  content: string;
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
  const inputRef = useRef<HTMLInputElement>(null);
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
      
      // Start with a greeting that analyzes their data
      sendMessage("Hey! Give me a quick overview of my content performance.", true);
    } catch {
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  };

  const sendMessage = async (messageText: string, isInitial = false) => {
    if (isLoading) return;
    
    const newUserMessage: Message = { role: "user", content: messageText };
    
    // For non-initial messages, show in UI
    if (!isInitial) {
      setMessages(prev => [...prev, newUserMessage]);
    }
    
    setIsLoading(true);

    try {
      // Send conversation history for context
      const historyToSend = isInitial ? [] : messages;
      
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          conversationHistory: historyToSend,
          videoScope,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const assistantMessage: Message = { role: "assistant", content: data.response };
      
      if (isInitial) {
        // For initial message, just show the response
        setMessages([assistantMessage]);
      } else {
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: Message = { 
        role: "assistant", 
        content: `Sorry, I had trouble processing that. ${error instanceof Error ? error.message : "Please try again."}` 
      };
      
      if (isInitial) {
        setMessages([errorMessage]);
      } else {
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const messageText = input.trim();
    setInput("");
    await sendMessage(messageText);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const suggestedQuestions = [
    "What's my best performing video?",
    "What hooks are working?",
    "Give me 3 video ideas",
    "What should I do more of?",
    "Compare my top 3 videos",
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

      <div className="relative z-10 flex flex-col h-full max-w-4xl mx-auto px-4 py-3 w-full">
        <AppHeader businessName={user?.businessName} />

        {/* Chat Container */}
        <div className="flex-1 bg-surface rounded-2xl border border-border/50 elegant-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-border/30 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-cream">💬 Chat with Your Data</h2>
                <p className="text-xs text-muted">Ask me anything about your content performance</p>
              </div>
              <select
                value={videoScope}
                onChange={(e) => setVideoScope(e.target.value)}
                className="px-2 py-1 bg-surface-light rounded-lg border border-border/30 text-xs text-cream focus:border-gold/50 focus:outline-none"
              >
                <option value="newest">Last 5</option>
                <option value="last10">Last 10</option>
                <option value="all">All Videos</option>
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-cream font-medium mb-2">Analyzing your content...</h3>
                <p className="text-muted text-sm">One moment while I look at your data</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-gold/20 text-cream"
                        : "bg-surface-light text-cream"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {isLoading && messages.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-surface-light p-3 rounded-2xl">
                  <div className="flex items-center gap-2 text-gold/60">
                    <div className="w-2 h-2 bg-gold/60 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-gold/60 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 bg-gold/60 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                    <span className="text-xs ml-1">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-3 py-2 border-t border-border/20 shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(q)}
                  disabled={isLoading}
                  className="px-2.5 py-1 bg-surface rounded-lg border border-border/30 text-[11px] text-gold/70 hover:text-gold hover:border-gold/30 transition-all whitespace-nowrap disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border/30 shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your videos..."
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none disabled:opacity-50 text-sm"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-gold to-gold-light text-forest rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
