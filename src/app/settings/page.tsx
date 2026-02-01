"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  businessName: string;
  email: string;
  timezone: string;
  contentNiche: string;
  primaryGoal: string;
  youtubeConnected: boolean;
  youtubeChannel: {
    channelId: string;
    title: string;
    thumbnailUrl: string;
  } | null;
  platforms: string[];
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    checkAuth();
    
    // Check for URL params (from OAuth callback)
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    
    if (success === "youtube_connected") {
      setMessage({ type: "success", text: "YouTube connected successfully!" });
    } else if (error) {
      setMessage({ type: "error", text: `Connection failed: ${error}` });
    }
  }, [searchParams]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth");
      const data = await response.json();

      if (!data.authenticated) {
        router.push("/login");
        return;
      }

      setUser(data.user);
      setCheckingAuth(false);
    } catch {
      router.push("/login");
    }
  };

  const handleConnectYouTube = async () => {
    setIsConnecting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/youtube/connect");
      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("Failed to get auth URL");
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to connect",
      });
      setIsConnecting(false);
    }
  };

  const handleSyncYouTube = async () => {
    setIsSyncing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/youtube/sync", { method: "POST" });
      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Sync complete! ${data.newVideosCount} new videos found.`,
        });
        checkAuth(); // Refresh user data
      } else {
        throw new Error(data.error || "Sync failed");
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Sync failed",
      });
    } finally {
      setIsSyncing(false);
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

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gold/60 hover:text-gold transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">
            <span className="gold-text">Settings</span>
          </h1>
        </header>

        {/* Messages */}
        {message && (
          <div
            className={`p-4 rounded-xl mb-6 ${
              message.type === "success"
                ? "bg-green-900/20 border border-green-500/30 text-green-400"
                : "bg-red-900/20 border border-red-500/30 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Account Info */}
          <div className="bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
            <h2 className="text-lg font-semibold text-cream mb-4">Account</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted">Business Name</span>
                <span className="text-cream">{user?.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Email</span>
                <span className="text-cream">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Content Niche</span>
                <span className="text-cream">{user?.contentNiche}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Primary Goal</span>
                <span className="text-cream">{user?.primaryGoal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Timezone</span>
                <span className="text-cream">{user?.timezone}</span>
              </div>
            </div>
          </div>

          {/* YouTube Connection */}
          <div className="bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
            <h2 className="text-lg font-semibold text-cream mb-4">YouTube Connection</h2>
            
            {user?.youtubeConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-light">
                  {user.youtubeChannel?.thumbnailUrl && (
                    <img
                      src={user.youtubeChannel.thumbnailUrl}
                      alt=""
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-cream font-medium">{user.youtubeChannel?.title}</p>
                    <p className="text-xs text-green-400">✓ Connected</p>
                  </div>
                </div>
                
                <button
                  onClick={handleSyncYouTube}
                  disabled={isSyncing}
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    isSyncing
                      ? "bg-surface-light text-muted cursor-not-allowed"
                      : "bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20"
                  }`}
                >
                  {isSyncing ? "Syncing..." : "🔄 Sync Videos"}
                </button>

                <p className="text-xs text-muted text-center">
                  This pulls your latest uploads. Run periodically to stay updated.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted text-sm">
                  Connect your YouTube channel to automatically import your videos.
                  We only access video titles, thumbnails, and publish dates.
                </p>
                
                <button
                  onClick={handleConnectYouTube}
                  disabled={isConnecting}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    isConnecting
                      ? "bg-surface-light text-muted cursor-not-allowed"
                      : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:opacity-90"
                  }`}
                >
                  {isConnecting ? "Connecting..." : "▶️ Connect YouTube"}
                </button>
              </div>
            )}
          </div>

          {/* Active Platforms */}
          <div className="bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
            <h2 className="text-lg font-semibold text-cream mb-4">Active Platforms</h2>
            <div className="flex flex-wrap gap-2">
              {user?.platforms.map((platform) => (
                <span
                  key={platform}
                  className="px-4 py-2 rounded-full text-sm bg-surface-light text-cream border border-border/30"
                >
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </span>
              ))}
            </div>
          </div>

          {/* Data Export/Import */}
          <div className="bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
            <h2 className="text-lg font-semibold text-cream mb-4">Data</h2>
            <div className="grid grid-cols-2 gap-4">
              <button className="py-3 rounded-xl bg-surface-light text-cream hover:bg-gold/10 transition-all">
                📥 Export CSV
              </button>
              <button className="py-3 rounded-xl bg-surface-light text-cream hover:bg-gold/10 transition-all">
                📤 Import CSV
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-surface rounded-2xl border border-red-500/20 p-6">
            <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all"
              >
                Log Out
              </button>
              <button className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
