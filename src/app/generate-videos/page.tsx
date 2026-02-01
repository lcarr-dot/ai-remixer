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
  const [tone, setTone] = useState("engaging");
  const [duration, setDuration] = useState("60");
  const [ctaGoal, setCtaGoal] = useState("");
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
          tone,
          duration: parseInt(duration),
          ctaGoal,
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
    <div className="min-h-screen bg-background classic-pattern">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-6">
        <AppHeader businessName={user?.businessName} />

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-2 bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
            <h2 className="text-lg font-semibold text-cream mb-4">🎬 Generate Video</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                  Topic / Idea <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What's the video about?"
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
                    Duration (sec)
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream focus:border-gold/50 focus:outline-none"
                  >
                    <option value="15">15s</option>
                    <option value="30">30s</option>
                    <option value="60">60s</option>
                    <option value="90">90s</option>
                    <option value="180">3min</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                  Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream focus:border-gold/50 focus:outline-none"
                >
                  <option value="engaging">Engaging</option>
                  <option value="educational">Educational</option>
                  <option value="entertaining">Entertaining</option>
                  <option value="inspiring">Inspiring</option>
                  <option value="controversial">Controversial</option>
                  <option value="storytelling">Storytelling</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                  CTA Goal
                </label>
                <input
                  type="text"
                  value={ctaGoal}
                  onChange={(e) => setCtaGoal(e.target.value)}
                  placeholder="Follow, like, comment, check link..."
                  className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                  Must Include (one per line)
                </label>
                <textarea
                  value={mustInclude}
                  onChange={(e) => setMustInclude(e.target.value)}
                  placeholder="Key points to include..."
                  rows={3}
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
          <div className="lg:col-span-3 bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-cream">Generated Content</h2>
              {draft && (
                <div className="flex items-center gap-2">
                  {savedMessage && (
                    <span className="text-xs text-green-400">{savedMessage}</span>
                  )}
                  <button
                    onClick={handleSaveDraft}
                    className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-gold text-xs font-medium hover:bg-gold/20 transition-all"
                  >
                    💾 Save Draft
                  </button>
                </div>
              )}
            </div>

            {!draft ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3 opacity-40">🎬</div>
                <p className="text-muted">Fill in the form and generate content</p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2">
                {/* Hooks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gold">🎣 Hooks (3 options)</h3>
                    <button
                      onClick={() => copyToClipboard(draft.hooks.join("\n\n"), "hooks")}
                      className={`text-xs px-2 py-1 rounded ${
                        copiedSection === "hooks"
                          ? "bg-green-900/30 text-green-400"
                          : "bg-surface-light text-gold/70 hover:text-gold"
                      }`}
                    >
                      {copiedSection === "hooks" ? "✓ Copied" : "Copy All"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {draft.hooks.map((hook, i) => (
                      <div
                        key={i}
                        className="p-3 bg-surface-light rounded-lg text-sm text-cream/90 flex items-start justify-between gap-2"
                      >
                        <span>
                          <span className="text-gold font-bold">{i + 1}.</span> {hook}
                        </span>
                        <button
                          onClick={() => copyToClipboard(hook, `hook-${i}`)}
                          className="text-xs text-gold/50 hover:text-gold shrink-0"
                        >
                          📋
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Script */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gold">📝 Script</h3>
                    <button
                      onClick={() => copyToClipboard(draft.script, "script")}
                      className={`text-xs px-2 py-1 rounded ${
                        copiedSection === "script"
                          ? "bg-green-900/30 text-green-400"
                          : "bg-surface-light text-gold/70 hover:text-gold"
                      }`}
                    >
                      {copiedSection === "script" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-4 bg-surface-light rounded-lg text-sm text-cream/90 whitespace-pre-wrap">
                    {draft.script}
                  </div>
                </div>

                {/* Descriptions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gold">💬 Descriptions (2 options)</h3>
                  </div>
                  <div className="space-y-2">
                    {draft.descriptions.map((desc, i) => (
                      <div
                        key={i}
                        className="p-3 bg-surface-light rounded-lg text-sm text-cream/90 flex items-start justify-between gap-2"
                      >
                        <span className="whitespace-pre-wrap">{desc}</span>
                        <button
                          onClick={() => copyToClipboard(desc, `desc-${i}`)}
                          className="text-xs text-gold/50 hover:text-gold shrink-0"
                        >
                          📋
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hashtags */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gold"># Hashtags</h3>
                    <button
                      onClick={() => copyToClipboard(draft.hashtags.join(" "), "hashtags")}
                      className={`text-xs px-2 py-1 rounded ${
                        copiedSection === "hashtags"
                          ? "bg-green-900/30 text-green-400"
                          : "bg-surface-light text-gold/70 hover:text-gold"
                      }`}
                    >
                      {copiedSection === "hashtags" ? "✓ Copied" : "Copy All"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {draft.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded text-xs bg-gold/10 text-gold border border-gold/20"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Shot List */}
                {draft.shotList && draft.shotList.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gold mb-2">🎥 Shot List</h3>
                    <ol className="space-y-1">
                      {draft.shotList.map((shot, i) => (
                        <li key={i} className="text-sm text-cream/80 flex items-start gap-2">
                          <span className="text-gold">{i + 1}.</span>
                          {shot}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Why This Should Work */}
                <div className="p-4 bg-green-900/10 border border-green-500/20 rounded-lg">
                  <h3 className="text-sm font-semibold text-green-400 mb-2">✅ Why This Should Work</h3>
                  <p className="text-sm text-cream/80">{draft.whyThisShouldWork}</p>
                </div>

                {/* What To Test */}
                <div className="p-4 bg-yellow-900/10 border border-yellow-500/20 rounded-lg">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-2">🧪 What To Test</h3>
                  <p className="text-sm text-cream/80">{draft.whatToTest}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
