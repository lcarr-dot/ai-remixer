"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface AppHeaderProps {
  businessName?: string;
}

export default function AppHeader({ businessName }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/");
  };

  const navItems = [
    { href: "/generate-videos", label: "Generate", icon: "🎬" },
    { href: "/market-research", label: "Research", icon: "🔍" },
    { href: "/insights", label: "Insights", icon: "💡" },
    { href: "/storage", label: "Storage", icon: "📦" },
  ];

  return (
    <header className="flex justify-between items-center mb-4 shrink-0">
      <Link href="/generate-videos" className="text-xl font-bold tracking-tight">
        <span className="gold-text">three seconds</span>
      </Link>
      <div className="flex items-center gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              pathname === item.href
                ? "bg-gold/10 border-gold/50 text-gold"
                : "bg-surface border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40"
            }`}
          >
            {item.icon} {item.label}
          </Link>
        ))}
        <span className="text-xs text-muted mx-2">|</span>
        <span className="text-xs text-muted">{businessName}</span>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg bg-surface border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 transition-all text-xs"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
