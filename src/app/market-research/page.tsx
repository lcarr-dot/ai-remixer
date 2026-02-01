"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

interface ResearchSnapshot {
  id: string;
  niche: string;
  platforms: string[];
  trendingThemes: string[];
  hookPatterns: string[];
  editingPatterns: string[];
  postingPatterns: string[];
  whyWorking: string;
  actionableIdeas: string[];
  createdAt: string;
}

interface User {
  businessName: string;
}

export default function MarketResearchPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [niche, setNiche] = useState("");
  const [keywords, setKeywords] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["youtube", "tiktok"]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<ResearchSnapshot | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadLatestSnapshot();
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
      // Pre-fill niche if available from user profile
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
      // No existing snapshot, that's fine
    }
  };

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleRunResearch = async () => {
    if (!niche.trim()) {
      setError("Please enter a niche");
      return;
    }
    if (platforms.length === 0) {
      setError("Please select at least one platform");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/market-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, keywords, platforms }),
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

  const handleSaveToStorage = async () => {
    if (!snapshot) return;

    try {
      const response = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "market_research",
          data: snapshot,
        }),
      });

      if (response.ok) {
        setSavedMessage("Saved to storage!");
        setTimeout(() => setSavedMessage(""), 3000);
      }
    } catch {
      setError("Failed to save to storage");
    }
  };

  if (checkingAuth) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-gold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background classic-pattern">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-6">
        <AppHeader businessName={user?.businessName} />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
            <h2 className="text-lg font-semibold text-cream mb-4">🔍 Market Research</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                  Niche
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g., Finance & Investing"
                  className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                  Keywords (optional)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="stocks, crypto, side hustle..."
                  className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                  Platform Focus
                </label>
                <div className="flex gap-2">
                  {["youtube", "tiktok"].map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                        platforms.includes(p)
                          ? "bg-gold/10 border-gold/50 text-gold"
                          : "bg-surface-light border-border/30 text-muted hover:border-gold/30"
                      }`}
                    >
                      {p === "youtube" ? "▶ YouTube" : "♪ TikTok"}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleRunResearch}
                disabled={isLoading}
                className={`w-full py-3 rounded-xl font-semibold uppercase tracking-wide transition-all ${
                  isLoading
                    ? "bg-gold/50 cursor-not-allowed text-forest"
                    : "bg-gradient-to-r from-gold to-gold-light hover:opacity-90 text-forest"
                }`}
              >
                {isLoading ? "Researching..." : "Run Research"}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-cream">Research Results</h2>
              {snapshot && (
                <div className="flex items-center gap-2">
                  {savedMessage && (
                    <span className="text-xs text-green-400">{savedMessage}</span>
                  )}
                  <button
                    onClick={handleSaveToStorage}
                    className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-gold text-xs font-medium hover:bg-gold/20 transition-all"
                  >
                    💾 Save to Storage
                  </button>
                </div>
              )}
            </div>

            {!snapshot ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3 opacity-40">🔍</div>
                <p className="text-muted">Run research to see trends and ideas</p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {/* Trending Themes */}
                <div>
                  <h3 className="text-sm font-semibold text-gold mb-2">🔥 Trending Themes</h3>
                  <div className="flex flex-wrap gap-2">
                    {snapshot.trendingThemes.map((theme, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full text-xs bg-gold/10 text-gold border border-gold/20"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Hook Patterns */}
                <div>
                  <h3 className="text-sm font-semibold text-gold mb-2">🎣 Hook Patterns</h3>
                  <ul className="space-y-1">
                    {snapshot.hookPatterns.map((pattern, i) => (
                      <li key={i} className="text-sm text-cream/80 flex items-start gap-2">
                        <span className="text-gold/60">•</span>
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Editing Patterns */}
                <div>
                  <h3 className="text-sm font-semibold text-gold mb-2">✂️ Editing Patterns</h3>
                  <ul className="space-y-1">
                    {snapshot.editingPatterns.map((pattern, i) => (
                      <li key={i} className="text-sm text-cream/80 flex items-start gap-2">
                        <span className="text-gold/60">•</span>
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Posting Patterns */}
                <div>
                  <h3 className="text-sm font-semibold text-gold mb-2">📅 Posting Patterns</h3>
                  <ul className="space-y-1">
                    {snapshot.postingPatterns.map((pattern, i) => (
                      <li key={i} className="text-sm text-cream/80 flex items-start gap-2">
                        <span className="text-gold/60">•</span>
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Why It's Working */}
                <div>
                  <h3 className="text-sm font-semibold text-gold mb-2">💡 Why It&apos;s Working</h3>
                  <p className="text-sm text-cream/80 bg-surface-light p-3 rounded-lg">
                    {snapshot.whyWorking}
                  </p>
                </div>

                {/* Actionable Ideas */}
                <div>
                  <h3 className="text-sm font-semibold text-gold mb-2">🚀 10 Actionable Ideas</h3>
                  <ol className="space-y-2">
                    {snapshot.actionableIdeas.map((idea, i) => (
                      <li key={i} className="text-sm text-cream/80 flex items-start gap-2 bg-surface-light p-2 rounded-lg">
                        <span className="text-gold font-bold">{i + 1}.</span>
                        {idea}
                      </li>
                    ))}
                  </ol>
                </div>

                <p className="text-xs text-muted text-center pt-4">
                  Generated {new Date(snapshot.createdAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
