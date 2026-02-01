"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  businessName: string;
  youtubeConnected: boolean;
  youtubeChannel: {
    title: string;
    thumbnailUrl: string;
  } | null;
  platforms: string[];
}

interface MissingDataItem {
  field: string;
  count: number;
  priority: "high" | "medium" | "low";
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [logText, setLogText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logSuccess, setLogSuccess] = useState("");
  const [logError, setLogError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [missingData] = useState<MissingDataItem[]>([
    { field: "TikTok views", count: 0, priority: "high" },
    { field: "YouTube watch time", count: 0, priority: "high" },
    { field: "Hook/concept", count: 0, priority: "medium" },
    { field: "Hashtags", count: 0, priority: "low" },
  ]);
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

      if (!data.user.onboardingComplete) {
        router.push("/onboarding");
        return;
      }

      setUser(data.user);
      setCheckingAuth(false);
    } catch {
      router.push("/login");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/");
  };

  const handleLogSubmit = async () => {
    if (!logText.trim()) return;

    setIsSubmitting(true);
    setLogError("");
    setLogSuccess("");

    try {
      const response = await fetch("/api/log-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: logText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to log update");
      }

      setLogSuccess("Update logged! Processing...");
      setLogText("");

      // Clear success message after 3 seconds
      setTimeout(() => setLogSuccess(""), 3000);
    } catch (err) {
      setLogError(err instanceof Error ? err.message : "Failed to log update");
    } finally {
      setIsSubmitting(false);
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
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              <span className="gold-text">Dashboard</span>
            </h1>
            <p className="text-muted text-sm">Welcome back, {user?.businessName}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/videos"
              className="px-4 py-2 rounded-lg bg-surface border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 transition-all text-sm"
            >
              📊 Video Tracker
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2 rounded-lg bg-surface border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 transition-all text-sm"
            >
              ⚙️ Settings
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-surface border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 transition-all text-sm"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Priority Notice */}
        <div className="p-4 rounded-xl bg-gold/5 border border-gold/20 mb-8">
          <p className="text-sm text-gold">
            💡 <strong>For best insights:</strong> Focus on logging YouTube + TikTok performance first.
            These platforms drive discovery and signal content-market fit.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Log Update Card */}
            <div className="bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
              <h2 className="text-lg font-semibold text-cream mb-1">Log Update</h2>
              <p className="text-sm text-muted mb-4">
                Tell the AI anything about your videos - metrics, hooks, hashtags, what worked...
              </p>

              <textarea
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Example: My newest video got 12k views on TikTok, 900 on Instagram. The hook was 'Here's what no one tells you about...' Used hashtags #finance #investing"
                className="w-full h-32 bg-surface-light rounded-xl p-4 text-cream placeholder-muted/50 border border-border/30 focus:border-gold/50 focus:outline-none resize-none mb-4"
              />

              {logError && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm mb-4">
                  {logError}
                </div>
              )}

              {logSuccess && (
                <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30 text-green-400 text-sm mb-4">
                  {logSuccess}
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  disabled
                  className="px-4 py-2 rounded-lg bg-surface-light text-muted/50 text-sm cursor-not-allowed"
                >
                  🎤 Voice (coming soon)
                </button>
                <button
                  onClick={handleLogSubmit}
                  disabled={isSubmitting || !logText.trim()}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    isSubmitting || !logText.trim()
                      ? "bg-surface-light text-muted cursor-not-allowed"
                      : "bg-gradient-to-r from-gold to-gold-light text-forest hover:opacity-90"
                  }`}
                >
                  {isSubmitting ? "Logging..." : "Log Update"}
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface rounded-xl border border-border/50 p-4 text-center">
                <div className="text-2xl font-bold gold-text mb-1">0</div>
                <div className="text-xs text-muted uppercase tracking-wider">Videos Tracked</div>
              </div>
              <div className="bg-surface rounded-xl border border-border/50 p-4 text-center">
                <div className="text-2xl font-bold gold-text mb-1">0</div>
                <div className="text-xs text-muted uppercase tracking-wider">Platforms</div>
              </div>
              <div className="bg-surface rounded-xl border border-border/50 p-4 text-center">
                <div className="text-2xl font-bold gold-text mb-1">0%</div>
                <div className="text-xs text-muted uppercase tracking-wider">Data Complete</div>
              </div>
            </div>

            {/* Insights Card */}
            <div className="bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
              <h2 className="text-lg font-semibold text-cream mb-4">AI Insights</h2>
              
              <div className="text-center py-8">
                <div className="text-4xl mb-3 opacity-40">🔮</div>
                <p className="text-muted">Add more video data to unlock insights</p>
                <p className="text-sm text-muted/70 mt-1">
                  Log YouTube + TikTok metrics for at least 5 videos
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* YouTube Connection */}
            <div className="bg-surface rounded-2xl border border-border/50 p-6">
              <h3 className="text-sm font-semibold text-cream mb-3">YouTube Connection</h3>
              {user?.youtubeConnected ? (
                <div className="flex items-center gap-3">
                  {user.youtubeChannel?.thumbnailUrl && (
                    <img
                      src={user.youtubeChannel.thumbnailUrl}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-cream font-medium truncate">
                      {user.youtubeChannel?.title}
                    </p>
                    <p className="text-xs text-green-400">✓ Connected</p>
                  </div>
                </div>
              ) : (
                <Link
                  href="/settings"
                  className="block w-full py-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-center text-sm hover:bg-red-900/30 transition-all"
                >
                  Connect YouTube →
                </Link>
              )}
            </div>

            {/* Missing Data Panel */}
            <div className="bg-surface rounded-2xl border border-border/50 p-6">
              <h3 className="text-sm font-semibold text-cream mb-3">Top Missing Data</h3>
              <p className="text-xs text-muted mb-4">
                Fill these to improve insight quality
              </p>

              {missingData.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">
                  No missing data! 🎉
                </p>
              ) : (
                <div className="space-y-2">
                  {missingData.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface-light"
                    >
                      <span className="text-sm text-cream">{item.field}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          item.priority === "high"
                            ? "bg-red-900/30 text-red-400"
                            : item.priority === "medium"
                            ? "bg-yellow-900/30 text-yellow-400"
                            : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {item.count} missing
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href="/videos"
                className="block w-full mt-4 py-2 rounded-lg border border-gold/20 text-gold/70 text-center text-sm hover:border-gold/40 hover:text-gold transition-all"
              >
                View all videos →
              </Link>
            </div>

            {/* Active Platforms */}
            <div className="bg-surface rounded-2xl border border-border/50 p-6">
              <h3 className="text-sm font-semibold text-cream mb-3">Active Platforms</h3>
              <div className="flex flex-wrap gap-2">
                {user?.platforms.map((platform) => (
                  <span
                    key={platform}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      platform === "youtube" || platform === "tiktok"
                        ? "bg-gold/10 text-gold border border-gold/30"
                        : "bg-surface-light text-muted"
                    }`}
                  >
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
