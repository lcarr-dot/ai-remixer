"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface VideoRow {
  id: string;
  youtubeVideoId: string | null;
  title: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  hook: string | null;
  hashtags: string[] | null;
  format: string | null;
  topic: string | null;
  missingCount: number;
  missingFields: string[];
  [key: string]: unknown;
}

interface MissingSummary {
  totalVideos: number;
  tiktokViewsMissing: number;
  youtubeViewsMissing: number;
  hookMissing: number;
  hashtagsMissing: number;
  formatMissing: number;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [missingSummary, setMissingSummary] = useState<MissingSummary | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!checkingAuth) {
      fetchVideos();
    }
  }, [checkingAuth, filter]);

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

      setCheckingAuth(false);
    } catch {
      router.push("/login");
    }
  };

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const url = filter ? `/api/videos?filter=${filter}` : "/api/videos";
      const response = await fetch(url);
      const data = await response.json();

      setVideos(data.videos || []);
      setPlatforms(data.platforms || []);
      setMissingSummary(data.missingDataSummary || null);
    } catch (error) {
      console.error("Failed to fetch videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number | null): string => {
    if (num === null) return "—";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const MissingBadge = () => (
    <span className="px-2 py-0.5 rounded text-xs bg-gray-700/50 text-gray-400">
      Missing
    </span>
  );

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

      <div className="relative z-10 max-w-[95vw] mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gold/60 hover:text-gold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                <span className="gold-text">Video Tracker</span>
              </h1>
              <p className="text-muted text-sm">
                {videos.length} videos • {missingSummary?.totalVideos || 0} total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-surface border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 transition-all text-sm"
              onClick={() => {/* TODO: Export CSV */}}
            >
              📥 Export CSV
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-surface border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 transition-all text-sm"
              onClick={() => {/* TODO: Import CSV */}}
            >
              📤 Import CSV
            </button>
          </div>
        </header>

        {/* Missing Data Summary */}
        {missingSummary && (
          <div className="grid grid-cols-6 gap-3 mb-6">
            <button
              onClick={() => setFilter("")}
              className={`p-3 rounded-xl border text-center transition-all ${
                filter === ""
                  ? "bg-gold/10 border-gold/50"
                  : "bg-surface border-border/50 hover:border-gold/30"
              }`}
            >
              <div className="text-lg font-bold text-cream">{missingSummary.totalVideos}</div>
              <div className="text-xs text-muted">All Videos</div>
            </button>
            <button
              onClick={() => setFilter("missing_youtube")}
              className={`p-3 rounded-xl border text-center transition-all ${
                filter === "missing_youtube"
                  ? "bg-red-900/20 border-red-500/50"
                  : "bg-surface border-border/50 hover:border-red-500/30"
              }`}
            >
              <div className="text-lg font-bold text-red-400">{missingSummary.youtubeViewsMissing}</div>
              <div className="text-xs text-muted">Missing YT Views</div>
            </button>
            <button
              onClick={() => setFilter("missing_tiktok")}
              className={`p-3 rounded-xl border text-center transition-all ${
                filter === "missing_tiktok"
                  ? "bg-red-900/20 border-red-500/50"
                  : "bg-surface border-border/50 hover:border-red-500/30"
              }`}
            >
              <div className="text-lg font-bold text-red-400">{missingSummary.tiktokViewsMissing}</div>
              <div className="text-xs text-muted">Missing TT Views</div>
            </button>
            <button
              onClick={() => setFilter("missing_hook")}
              className={`p-3 rounded-xl border text-center transition-all ${
                filter === "missing_hook"
                  ? "bg-yellow-900/20 border-yellow-500/50"
                  : "bg-surface border-border/50 hover:border-yellow-500/30"
              }`}
            >
              <div className="text-lg font-bold text-yellow-400">{missingSummary.hookMissing}</div>
              <div className="text-xs text-muted">Missing Hook</div>
            </button>
            <button
              onClick={() => setFilter("has_missing")}
              className={`p-3 rounded-xl border text-center transition-all ${
                filter === "has_missing"
                  ? "bg-orange-900/20 border-orange-500/50"
                  : "bg-surface border-border/50 hover:border-orange-500/30"
              }`}
            >
              <div className="text-lg font-bold text-orange-400">
                {videos.filter((v) => v.missingCount > 0).length}
              </div>
              <div className="text-xs text-muted">Has Missing Data</div>
            </button>
            <button
              onClick={() => fetchVideos()}
              className="p-3 rounded-xl border bg-surface border-border/50 hover:border-gold/30 text-center transition-all"
            >
              <div className="text-lg">🔄</div>
              <div className="text-xs text-muted">Refresh</div>
            </button>
          </div>
        )}

        {/* Spreadsheet */}
        <div className="bg-surface rounded-2xl border border-border/50 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-20 text-muted">Loading videos...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-3 opacity-40">📹</div>
              <p className="text-muted">No videos yet</p>
              <p className="text-sm text-muted/70 mt-1">
                Connect YouTube or add videos manually
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-surface-light">
                    <th className="sticky left-0 bg-surface-light px-4 py-3 text-left text-xs font-medium text-gold/80 uppercase tracking-wider">
                      Video
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gold/80 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gold/80 uppercase tracking-wider">
                      Hook
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gold/80 uppercase tracking-wider">
                      Format
                    </th>
                    {platforms.includes("youtube") && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gold/80 uppercase tracking-wider bg-red-900/10">
                        YT Views
                      </th>
                    )}
                    {platforms.includes("tiktok") && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gold/80 uppercase tracking-wider bg-cyan-900/10">
                        TT Views
                      </th>
                    )}
                    {platforms.includes("instagram") && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gold/80 uppercase tracking-wider bg-pink-900/10">
                        IG Views
                      </th>
                    )}
                    {platforms.includes("shorts") && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gold/80 uppercase tracking-wider">
                        Shorts Views
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gold/80 uppercase tracking-wider">
                      Missing
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video) => (
                    <tr
                      key={video.id}
                      className="border-b border-border/30 hover:bg-surface-light/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/videos/${video.id}`)}
                    >
                      <td className="sticky left-0 bg-surface px-4 py-3">
                        <div className="flex items-center gap-3 max-w-xs">
                          {video.thumbnailUrl && (
                            <img
                              src={video.thumbnailUrl}
                              alt=""
                              className="w-16 h-9 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <span className="text-cream font-medium truncate">
                            {video.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">
                        {formatDate(video.publishedAt)}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {video.hook ? (
                          <span className="text-cream truncate block">{video.hook}</span>
                        ) : (
                          <MissingBadge />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {video.format ? (
                          <span className="text-cream">{video.format}</span>
                        ) : (
                          <MissingBadge />
                        )}
                      </td>
                      {platforms.includes("youtube") && (
                        <td className="px-4 py-3 bg-red-900/5">
                          {video.youtube_views !== null ? (
                            <span className="text-cream font-medium">
                              {formatNumber(video.youtube_views as number)}
                            </span>
                          ) : (
                            <MissingBadge />
                          )}
                        </td>
                      )}
                      {platforms.includes("tiktok") && (
                        <td className="px-4 py-3 bg-cyan-900/5">
                          {video.tiktok_views !== null ? (
                            <span className="text-cream font-medium">
                              {formatNumber(video.tiktok_views as number)}
                            </span>
                          ) : (
                            <MissingBadge />
                          )}
                        </td>
                      )}
                      {platforms.includes("instagram") && (
                        <td className="px-4 py-3 bg-pink-900/5">
                          {video.instagram_views !== null ? (
                            <span className="text-cream font-medium">
                              {formatNumber(video.instagram_views as number)}
                            </span>
                          ) : (
                            <MissingBadge />
                          )}
                        </td>
                      )}
                      {platforms.includes("shorts") && (
                        <td className="px-4 py-3">
                          {video.shorts_views !== null ? (
                            <span className="text-cream font-medium">
                              {formatNumber(video.shorts_views as number)}
                            </span>
                          ) : (
                            <MissingBadge />
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {video.missingCount > 0 ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-red-900/30 text-red-400">
                            {video.missingCount} fields
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-900/30 text-green-400">
                            Complete
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Help text */}
        <div className="mt-6 p-4 rounded-xl bg-gold/5 border border-gold/20">
          <p className="text-sm text-gold">
            💡 <strong>Tip:</strong> Click any row to view/edit all fields. Use the Log Update on the
            dashboard to quickly add metrics by telling the AI what happened.
          </p>
        </div>
      </div>
    </div>
  );
}
