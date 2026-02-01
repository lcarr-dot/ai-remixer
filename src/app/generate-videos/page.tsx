"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

interface GeneratedDraft {
  id: string;
  topic: string;
  hooks: string[];
  script: string;
  descriptions: string[];
  hashtags: string[];
  shotList?: string[];
  whyThisShouldWork: string;
  whatToTest: string;
  createdAt: string;
}

interface User {
  businessName: string;
}

export default function GenerateVideosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [duration, setDuration] = useState("60");
  const [mustInclude, setMustInclude] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
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

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic/idea");
      return;
    }

    setIsLoading(true);
    setError("");
    setDraft(null);

    try {
      const response = await fetch("/api/generate-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform,
          duration: parseInt(duration),
          mustInclude: mustInclude.split("\n").filter((s) => s.trim()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setDraft(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      setError("Failed to copy");
    }
  };

  const handleSaveDraft = async () => {
    if (!draft) return;

    try {
      const response = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "draft",
          data: draft,
        }),
      });

      if (response.ok) {
        setSavedMessage("Draft saved!");
        setTimeout(() => setSavedMessage(""), 3000);
      }
    } catch {
      setError("Failed to save draft");
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
    <div className="h-screen bg-background classic-pattern overflow-hidden flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-6xl mx-auto px-4 py-3 w-full overflow-hidden">
        <AppHeader businessName={user?.businessName} />

        {/* Value Prop Banner */}
        <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 mb-3 text-center shrink-0">
          <p className="text-sm text-gold">
            ✨ We analyze your past video data to generate the <strong>most viral hooks, scripts & descriptions</strong> for your niche.
          </p>
        </div>

        <div className="flex-1 grid lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">
          {/* Input Panel */}
          <div className="bg-surface rounded-xl border border-border/50 p-4 elegant-border overflow-auto">
            <h2 className="text-base font-semibold text-cream mb-3">🎬 Generate Content</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                  Topic / Idea <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What's the video about? e.g., 'Why index funds beat stock picking'"
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream focus:border-gold/50 focus:outline-none"
                  >
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="shorts">YT Shorts</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream focus:border-gold/50 focus:outline-none"
                  >
                    <option value="15">15 sec</option>
                    <option value="30">30 sec</option>
                    <option value="60">60 sec</option>
                    <option value="90">90 sec</option>
                    <option value="180">3 min</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                  Must Include <span className="text-muted">(optional, one per line)</span>
                </label>
                <textarea
                  value={mustInclude}
                  onChange={(e) => setMustInclude(e.target.value)}
                  placeholder="Key points to mention..."
                  rows={2}
                  className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none resize-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`w-full py-3 rounded-xl font-semibold uppercase tracking-wide transition-all ${
                  isLoading
                    ? "bg-gold/50 cursor-not-allowed text-forest"
                    : "bg-gradient-to-r from-gold to-gold-light hover:opacity-90 text-forest"
                }`}
              >
                {isLoading ? "Generating..." : "Generate Content"}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-surface rounded-xl border border-border/50 p-4 elegant-border flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-base font-semibold text-cream">Generated Content</h2>
              {draft && (
                <div className="flex items-center gap-2">
                  {savedMessage && (
                    <span className="text-xs text-green-400">{savedMessage}</span>
                  )}
                  <button
                    onClick={handleSaveDraft}
                    className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-gold text-xs font-medium hover:bg-gold/20 transition-all"
                  >
                    💾 Save
                  </button>
                </div>
              )}
            </div>

            {!draft ? (
              <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
                <div className="text-3xl mb-2 opacity-40">🎬</div>
                <p className="text-muted text-sm">Enter a topic and hit generate</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                {/* Hooks */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-gold">🎣 Hooks</h3>
                    <button
                      onClick={() => copyToClipboard(draft.hooks.join("\n\n"), "hooks")}
                      className={`text-[10px] px-2 py-0.5 rounded ${
                        copiedSection === "hooks"
                          ? "bg-green-900/30 text-green-400"
                          : "bg-surface-light text-gold/70 hover:text-gold"
                      }`}
                    >
                      {copiedSection === "hooks" ? "✓" : "Copy"}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {draft.hooks.map((hook, i) => (
                      <div
                        key={i}
                        className="p-2 bg-surface-light rounded-lg text-xs text-cream/90 flex items-start justify-between gap-2"
                      >
                        <span>
                          <span className="text-gold font-bold">{i + 1}.</span> {hook}
                        </span>
                        <button
                          onClick={() => copyToClipboard(hook, `hook-${i}`)}
                          className="text-[10px] text-gold/50 hover:text-gold shrink-0"
                        >
                          📋
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Script */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-gold">📝 Script</h3>
                    <button
                      onClick={() => copyToClipboard(draft.script, "script")}
                      className={`text-[10px] px-2 py-0.5 rounded ${
                        copiedSection === "script"
                          ? "bg-green-900/30 text-green-400"
                          : "bg-surface-light text-gold/70 hover:text-gold"
                      }`}
                    >
                      {copiedSection === "script" ? "✓" : "Copy"}
                    </button>
                  </div>
                  <div className="p-2 bg-surface-light rounded-lg text-xs text-cream/90 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {draft.script}
                  </div>
                </div>

                {/* Descriptions */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-gold">💬 Descriptions</h3>
                  </div>
                  <div className="space-y-1">
                    {draft.descriptions.map((desc, i) => (
                      <div
                        key={i}
                        className="p-2 bg-surface-light rounded-lg text-xs text-cream/90 flex items-start justify-between gap-2"
                      >
                        <span className="whitespace-pre-wrap">{desc}</span>
                        <button
                          onClick={() => copyToClipboard(desc, `desc-${i}`)}
                          className="text-[10px] text-gold/50 hover:text-gold shrink-0"
                        >
                          📋
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hashtags */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-gold"># Hashtags</h3>
                    <button
                      onClick={() => copyToClipboard(draft.hashtags.join(" "), "hashtags")}
                      className={`text-[10px] px-2 py-0.5 rounded ${
                        copiedSection === "hashtags"
                          ? "bg-green-900/30 text-green-400"
                          : "bg-surface-light text-gold/70 hover:text-gold"
                      }`}
                    >
                      {copiedSection === "hashtags" ? "✓" : "Copy"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {draft.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] bg-gold/10 text-gold border border-gold/20"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Why This Should Work */}
                <div className="p-2 bg-green-900/10 border border-green-500/20 rounded-lg">
                  <h3 className="text-[10px] font-semibold text-green-400 mb-1">✅ Why This Works</h3>
                  <p className="text-[11px] text-cream/80">{draft.whyThisShouldWork}</p>
                </div>

                {/* What To Test */}
                <div className="p-2 bg-yellow-900/10 border border-yellow-500/20 rounded-lg">
                  <h3 className="text-[10px] font-semibold text-yellow-400 mb-1">🧪 Test This</h3>
                  <p className="text-[11px] text-cream/80">{draft.whatToTest}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
