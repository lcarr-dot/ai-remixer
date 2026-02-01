"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { VIDEO_FORMATS } from "@/lib/validation";

interface VideoDetail {
  id: string;
  title: string;
  youtubeVideoId: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  manualFields: {
    hook: string | null;
    caption: string | null;
    hashtags: string[] | null;
    topic: string | null;
    format: string | null;
    cta: string | null;
    targetAudience: string | null;
    whyPosted: string | null;
    wearingOutfit: string | null;
    contentSummary: string | null;
    notes: string | null;
  } | null;
  platformMetrics: Array<{
    platform: string;
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
    watchTimeSeconds: number | null;
    followersGained: number | null;
  }>;
  auditLogs: Array<{
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedAt: string;
    source: string | null;
  }>;
}

export default function VideoDetailPage() {
  const params = useParams();
  const videoId = params.id as string;
  const router = useRouter();

  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [hook, setHook] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [format, setFormat] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchVideo();
  }, [videoId]);

  const fetchVideo = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push("/videos");
          return;
        }
        throw new Error("Failed to fetch video");
      }

      const data = await response.json();
      setVideo(data.video);

      // Populate form
      if (data.video.manualFields) {
        setHook(data.video.manualFields.hook || "");
        setCaption(data.video.manualFields.caption || "");
        setHashtags(data.video.manualFields.hashtags?.join(", ") || "");
        setFormat(data.video.manualFields.format || "");
        setTopic(data.video.manualFields.topic || "");
        setNotes(data.video.manualFields.notes || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load video");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualFields: {
            hook: hook || null,
            caption: caption || null,
            hashtags: hashtags ? hashtags.split(",").map((h) => h.trim()) : null,
            format: format || null,
            topic: topic || null,
            notes: notes || null,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      setSuccess("Changes saved!");
      fetchVideo(); // Refresh data
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatNumber = (num: number | null): string => {
    if (num === null) return "—";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-gold">Loading...</div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-muted">Video not found</div>
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

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-6">
          <Link
            href="/videos"
            className="inline-flex items-center gap-2 text-gold/60 hover:text-gold transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Videos
          </Link>

          <div className="flex items-start gap-4">
            {video.thumbnailUrl && (
              <img
                src={video.thumbnailUrl}
                alt=""
                className="w-40 h-24 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-cream mb-1">{video.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted">
                {video.publishedAt && (
                  <span>
                    {new Date(video.publishedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
                {video.durationSeconds && (
                  <span>{formatDuration(video.durationSeconds)}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Messages */}
        {error && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30 text-green-400 text-sm mb-6">
            {success}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Details */}
            <div className="bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
              <h2 className="text-lg font-semibold text-cream mb-4">Content Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                    Hook / Concept
                  </label>
                  <input
                    type="text"
                    value={hook}
                    onChange={(e) => setHook(e.target.value)}
                    placeholder="What was the hook that grabbed attention?"
                    className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                    Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream focus:border-gold/50 focus:outline-none"
                  >
                    <option value="">Select format...</option>
                    {VIDEO_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                    Hashtags
                  </label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="finance, investing, stocks (comma separated)"
                    className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="What's the main topic?"
                    className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                    Caption / Description
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="The caption used when posting"
                    rows={3}
                    className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any other notes about this video..."
                    rows={2}
                    className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`mt-6 w-full py-3 rounded-xl font-semibold transition-all ${
                  isSaving
                    ? "bg-surface-light text-muted cursor-not-allowed"
                    : "bg-gradient-to-r from-gold to-gold-light text-forest hover:opacity-90"
                }`}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Sidebar - Metrics & History */}
          <div className="space-y-6">
            {/* Platform Metrics */}
            <div className="bg-surface rounded-2xl border border-border/50 p-6">
              <h3 className="text-sm font-semibold text-cream mb-4">Platform Metrics</h3>

              {video.platformMetrics.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">
                  No metrics logged yet
                </p>
              ) : (
                <div className="space-y-3">
                  {video.platformMetrics.map((metrics) => (
                    <div
                      key={metrics.platform}
                      className="p-3 rounded-xl bg-surface-light"
                    >
                      <div className="font-medium text-cream capitalize mb-2">
                        {metrics.platform}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted">Views:</span>{" "}
                          <span className="text-cream">{formatNumber(metrics.views)}</span>
                        </div>
                        <div>
                          <span className="text-muted">Likes:</span>{" "}
                          <span className="text-cream">{formatNumber(metrics.likes)}</span>
                        </div>
                        <div>
                          <span className="text-muted">Comments:</span>{" "}
                          <span className="text-cream">{formatNumber(metrics.comments)}</span>
                        </div>
                        <div>
                          <span className="text-muted">Shares:</span>{" "}
                          <span className="text-cream">{formatNumber(metrics.shares)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted mt-4 text-center">
                Use Log Update on the dashboard to add metrics
              </p>
            </div>

            {/* Change History */}
            <div className="bg-surface rounded-2xl border border-border/50 p-6">
              <h3 className="text-sm font-semibold text-cream mb-4">Change History</h3>

              {video.auditLogs.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">
                  No changes recorded
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {video.auditLogs.slice(0, 10).map((log, i) => (
                    <div
                      key={i}
                      className="text-xs p-2 rounded bg-surface-light"
                    >
                      <div className="text-cream">{log.field}</div>
                      <div className="text-muted">
                        {log.oldValue ? `"${log.oldValue}"` : "(empty)"} →{" "}
                        {log.newValue ? `"${log.newValue}"` : "(empty)"}
                      </div>
                      <div className="text-muted/60 mt-1">
                        {new Date(log.changedAt).toLocaleString()} • {log.source}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
