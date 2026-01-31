"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

interface ChannelStats {
  subscriberCount: string;
  totalViews: string;
  videoCount: string;
}

function formatNumber(num: string): string {
  const n = parseInt(num);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [channelStats, setChannelStats] = useState<ChannelStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchYouTubeData();
  }, []);

  const fetchYouTubeData = async () => {
    try {
      const response = await fetch("/api/youtube");
      const data = await response.json();

      if (data.error && !data.videos) {
        setError(data.error);
      } else {
        setVideos(data.videos || []);
        setChannelStats(data.channelStats || null);
      }
    } catch {
      setError("Failed to load YouTube data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background classic-pattern">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gold/60 hover:text-gold transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Remixer
          </Link>
          <h1 className="text-4xl font-bold mb-2">
            <span className="gold-text">YouTube Dashboard</span>
          </h1>
          <p className="text-muted">Track your recent video performance</p>
        </header>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-3 text-gold">
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading YouTube data...
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-red-400 mb-4">{error}</div>
            <p className="text-muted text-sm">Make sure your YouTube API key is configured correctly.</p>
          </div>
        ) : (
          <>
            {/* Channel Stats */}
            {channelStats && (
              <div className="grid grid-cols-3 gap-4 mb-10">
                <div className="bg-surface rounded-xl border border-border/50 p-5 text-center">
                  <div className="text-3xl font-bold gold-text mb-1">
                    {formatNumber(channelStats.subscriberCount)}
                  </div>
                  <div className="text-sm text-muted uppercase tracking-wider">Subscribers</div>
                </div>
                <div className="bg-surface rounded-xl border border-border/50 p-5 text-center">
                  <div className="text-3xl font-bold gold-text mb-1">
                    {formatNumber(channelStats.totalViews)}
                  </div>
                  <div className="text-sm text-muted uppercase tracking-wider">Total Views</div>
                </div>
                <div className="bg-surface rounded-xl border border-border/50 p-5 text-center">
                  <div className="text-3xl font-bold gold-text mb-1">
                    {formatNumber(channelStats.videoCount)}
                  </div>
                  <div className="text-sm text-muted uppercase tracking-wider">Videos</div>
                </div>
              </div>
            )}

            {/* Recent Videos */}
            <h2 className="text-xl font-semibold text-cream mb-4">Recent Videos</h2>
            {videos.length === 0 ? (
              <div className="text-center py-10 text-muted">
                No videos found. Make sure your channel has public videos.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video) => (
                  <a
                    key={video.id}
                    href={`https://youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-surface rounded-xl border border-border/50 overflow-hidden hover:border-gold/30 transition-all"
                  >
                    <div className="relative aspect-video">
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                        {formatNumber(video.viewCount)} views
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-cream line-clamp-2 mb-2 group-hover:text-gold transition-colors">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {formatNumber(video.likeCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {formatNumber(video.commentCount)}
                        </span>
                      </div>
                      <div className="text-xs text-muted/70 mt-2">
                        {formatDate(video.publishedAt)}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="tracking-widest uppercase text-gold/30 text-xs">GGinvestments</p>
        </footer>
      </div>
    </div>
  );
}
