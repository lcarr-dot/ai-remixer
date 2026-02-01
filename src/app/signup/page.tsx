"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const niches = [
  "Business & Finance",
  "Lifestyle & Vlogging",
  "Fitness & Health",
  "Comedy & Entertainment",
  "Education & How-To",
  "Tech & Gaming",
  "Food & Travel",
  "Fashion & Beauty",
  "Motivation & Self-Improvement",
  "Other",
];

export default function SignupPage() {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [niche, setNiche] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [youtubeHandle, setYoutubeHandle] = useState("");
  const [facebookHandle, setFacebookHandle] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!businessName.trim()) {
      setError("Business name is required");
      return;
    }

    if (!niche) {
      setError("Please select your content niche");
      return;
    }

    if (!tiktokHandle && !instagramHandle && !youtubeHandle && !facebookHandle) {
      setError("Please provide at least one social media handle");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signup",
          email,
          password,
          businessName,
          niche,
          tiktokHandle,
          instagramHandle,
          youtubeHandle,
          facebookHandle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      // Go directly to the app/remixer page
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background classic-pattern flex items-center justify-center px-6 py-8">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-900/15 blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gold/60 hover:text-gold transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        {/* Form Card */}
        <div className="bg-surface rounded-2xl border border-border/50 p-8 elegant-border">
          <h1 className="text-2xl font-bold mb-1">
            <span className="gold-text">Create an account</span>
          </h1>
          <p className="text-muted text-sm mb-6">Start tracking your content performance</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-1.5">
                Business Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none transition-all"
                placeholder="Your business or channel name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-1.5">
                Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none transition-all"
                placeholder="••••••••"
              />
              <p className="text-xs text-muted mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-1.5">
                Content Niche <span className="text-red-400">*</span>
              </label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream focus:border-gold/50 focus:outline-none transition-all"
              >
                <option value="" className="text-muted">Select your niche</option>
                {niches.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-medium text-gold/80 uppercase tracking-wider mb-1.5">
                Social Media Handles <span className="text-muted">(at least one required)</span>
              </label>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg w-8">♪</span>
                  <input
                    type="text"
                    value={tiktokHandle}
                    onChange={(e) => setTiktokHandle(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none transition-all text-sm"
                    placeholder="TikTok handle (e.g., @yourhandle)"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-lg w-8">📷</span>
                  <input
                    type="text"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none transition-all text-sm"
                    placeholder="Instagram handle (e.g., @yourhandle)"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-lg w-8">▶</span>
                  <input
                    type="text"
                    value={youtubeHandle}
                    onChange={(e) => setYoutubeHandle(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none transition-all text-sm"
                    placeholder="YouTube handle (e.g., @yourhandle)"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-lg w-8">📘</span>
                  <input
                    type="text"
                    value={facebookHandle}
                    onChange={(e) => setFacebookHandle(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-surface-light rounded-xl border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none transition-all text-sm"
                    placeholder="Facebook handle (e.g., @yourpage)"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-semibold text-lg uppercase tracking-wide transition-all ${
                isLoading
                  ? "bg-gold/50 cursor-not-allowed text-forest"
                  : "bg-gradient-to-r from-gold to-gold-light hover:opacity-90 text-forest"
              }`}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-muted mt-6 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-gold hover:text-gold-light transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
