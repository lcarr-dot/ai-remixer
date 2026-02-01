import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="h-screen bg-background classic-pattern flex flex-col overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-900/15 blur-[150px]" />
        <div className="absolute top-[30%] right-[30%] w-[30%] h-[30%] rounded-full bg-gold/5 blur-[100px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* Main Content */}
        <div className="text-center max-w-2xl">
          {/* Logo / Title */}
          <h1 className="text-7xl md:text-8xl font-bold mb-6 tracking-tight">
            <span className="gold-text">three seconds</span>
          </h1>

          <p className="text-xl text-muted font-light mb-12 max-w-lg mx-auto">
            the content tracker that shows you what&apos;s working.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-gold to-gold-light text-forest font-semibold text-lg hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-wide"
            >
              Start Tracking Free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-surface border border-gold/30 text-gold font-semibold text-lg hover:border-gold/60 hover:bg-surface-light transition-all uppercase tracking-wide"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
