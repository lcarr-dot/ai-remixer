"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface User {
  businessName: string;
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
function renderInlineMarkdown(text: string): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={keyIndex++} className="font-semibold text-cream">
        {match[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
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
      
      // Start with a greeting
      sendMessage("Give me a quick overview of my content performance.", true);
    } catch {
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  };

  const sendMessage = async (messageText: string, isInitial = false) => {
    if (isLoading) return;
    
    const newUserMessage: Message = { role: "user", content: messageText };
    
    if (!isInitial) {
      setMessages(prev => [...prev, newUserMessage]);
    }
    
    setIsLoading(true);

    try {
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
    "Best performing video?",
    "What hooks work?",
    "Give me 3 video ideas",
    "What should I do more?",
    "Compare my top videos",
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

      <div className="relative z-10 flex flex-col h-full max-w-3xl mx-auto px-4 py-3 w-full">
        <AppHeader businessName={user?.businessName} />

        {/* Chat Container */}
        <div className="flex-1 bg-surface rounded-2xl border border-border/50 elegant-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/30 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-cream">💬 Chat with Your Data</h2>
                <p className="text-xs text-muted">Ask anything about your video performance</p>
              </div>
              <select
                value={videoScope}
                onChange={(e) => setVideoScope(e.target.value)}
                className="px-3 py-1.5 bg-surface-light rounded-lg border border-border/30 text-xs text-cream focus:border-gold/50 focus:outline-none"
              >
                <option value="newest">Last 5</option>
                <option value="last10">Last 10</option>
                <option value="all">All Videos</option>
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-cream font-medium mb-2">Analyzing your content...</h3>
                <p className="text-muted text-sm">Looking at your data</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl ${
                      msg.role === "user"
                        ? "bg-gold/20 p-3"
                        : "bg-surface-light p-4"
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
                </div>
              ))
            )}
            {isLoading && messages.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-surface-light p-4 rounded-2xl">
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
          <div className="px-4 py-2 border-t border-border/20 shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(q)}
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
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your videos..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none disabled:opacity-50 text-sm"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-5 py-3 bg-gradient-to-r from-gold to-gold-light text-forest rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
