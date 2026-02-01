"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PLATFORMS, NICHES, GOALS, TIMEZONES } from "@/lib/validation";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [timezone, setTimezone] = useState("America/New_York");
  const [contentNiche, setContentNiche] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
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

      if (data.user.onboardingComplete) {
        router.push("/dashboard");
        return;
      }

      setCheckingAuth(false);
    } catch {
      router.push("/login");
    }
  };

  const togglePlatform = (platformId: string) => {
    setPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSubmit = async () => {
    if (platforms.length === 0) {
      setError("Please select at least one platform");
      return;
    }
    if (!contentNiche) {
      setError("Please select your content niche");
      return;
    }
    if (!primaryGoal) {
      setError("Please select your primary goal");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms,
          timezone,
          contentNiche,
          primaryGoal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete onboarding");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
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
    <div className="min-h-screen bg-background classic-pattern flex items-center justify-center px-6 py-12">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-900/15 blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-all ${
                s <= step ? "bg-gold" : "bg-surface-light"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl border border-border/50 p-8 elegant-border">
          {/* Step 1: Platforms */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold mb-2">
                <span className="gold-text">Where do you post?</span>
              </h1>
              <p className="text-muted text-sm mb-6">
                Select all platforms you post content to
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      platforms.includes(platform.id)
                        ? "bg-gold/10 border-gold/50 text-cream"
                        : "bg-surface-light border-border/30 text-muted hover:border-gold/30"
                    }`}
                  >
                    <span className="font-medium">{platform.name}</span>
                    {(platform.id === "youtube" || platform.id === "tiktok") && (
                      <span className="text-xs text-gold ml-2">★ Priority</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-gold/5 border border-gold/20 mb-6">
                <p className="text-sm text-gold">
                  💡 <strong>Tip:</strong> YouTube + TikTok data are the most important for insights.
                  Focus on logging these first for best results.
                </p>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={platforms.length === 0}
                className={`w-full py-3 rounded-xl font-semibold uppercase tracking-wide transition-all ${
                  platforms.length === 0
                    ? "bg-surface-light text-muted cursor-not-allowed"
                    : "bg-gradient-to-r from-gold to-gold-light text-forest hover:opacity-90"
                }`}
              >
                Continue
              </button>
            </>
          )}

          {/* Step 2: Timezone */}
          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold mb-2">
                <span className="gold-text">Your timezone</span>
              </h1>
              <p className="text-muted text-sm mb-6">
                This helps us show posting times correctly
              </p>

              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-3 bg-surface-light rounded-xl border border-border/30 text-cream focus:border-gold/50 focus:outline-none mb-6"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz} className="bg-surface">
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl font-semibold uppercase tracking-wide bg-surface-light text-muted hover:text-cream transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-xl font-semibold uppercase tracking-wide bg-gradient-to-r from-gold to-gold-light text-forest hover:opacity-90 transition-all"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* Step 3: Niche */}
          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold mb-2">
                <span className="gold-text">Content niche</span>
              </h1>
              <p className="text-muted text-sm mb-6">
                What type of content do you create?
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {NICHES.map((niche) => (
                  <button
                    key={niche}
                    onClick={() => setContentNiche(niche)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      contentNiche === niche
                        ? "bg-gold/10 border-gold/50 text-cream"
                        : "bg-surface-light border-border/30 text-muted hover:border-gold/30"
                    }`}
                  >
                    {niche}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl font-semibold uppercase tracking-wide bg-surface-light text-muted hover:text-cream transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!contentNiche}
                  className={`flex-1 py-3 rounded-xl font-semibold uppercase tracking-wide transition-all ${
                    !contentNiche
                      ? "bg-surface-light text-muted cursor-not-allowed"
                      : "bg-gradient-to-r from-gold to-gold-light text-forest hover:opacity-90"
                  }`}
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* Step 4: Goal */}
          {step === 4 && (
            <>
              <h1 className="text-2xl font-bold mb-2">
                <span className="gold-text">Primary goal</span>
              </h1>
              <p className="text-muted text-sm mb-6">
                What&apos;s your main objective with content?
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {GOALS.map((goal) => (
                  <button
                    key={goal}
                    onClick={() => setPrimaryGoal(goal)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      primaryGoal === goal
                        ? "bg-gold/10 border-gold/50 text-cream"
                        : "bg-surface-light border-border/30 text-muted hover:border-gold/30"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm mb-4">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-xl font-semibold uppercase tracking-wide bg-surface-light text-muted hover:text-cream transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !primaryGoal}
                  className={`flex-1 py-3 rounded-xl font-semibold uppercase tracking-wide transition-all ${
                    isLoading || !primaryGoal
                      ? "bg-surface-light text-muted cursor-not-allowed"
                      : "bg-gradient-to-r from-gold to-gold-light text-forest hover:opacity-90"
                  }`}
                >
                  {isLoading ? "Setting up..." : "Complete Setup"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
