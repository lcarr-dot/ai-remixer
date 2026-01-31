import Link from "next/link";

const socials = [
  {
    name: "TikTok",
    handle: "@gg.investments",
    url: "https://tiktok.com/@gg.investments",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
  },
  {
    name: "Instagram",
    handle: "@gginvestments_",
    url: "https://instagram.com/gginvestments_",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="18" cy="6" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    handle: "@gginvestments",
    url: "https://youtube.com/@gginvestments",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
];

export default function SocialsPage() {
  return (
    <div className="h-screen bg-background classic-pattern flex flex-col overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-xl mx-auto px-6 py-8 w-full">
        {/* Header */}
        <header className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gold/60 hover:text-gold transition-colors mb-4 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Remixer
          </Link>
          <h1 className="text-3xl font-bold mb-1">
            <span className="gold-text">My Socials</span>
          </h1>
          <p className="text-muted text-sm">
            Follow GGinvestments
          </p>
        </header>

        {/* Social Links */}
        <div className="flex-1 flex flex-col justify-center space-y-3">
          {socials.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-surface rounded-xl border border-gold/20 p-4 transition-all hover:border-gold/50 hover:bg-surface-light group"
            >
              <div className="p-3 rounded-lg border border-gold/30 text-gold group-hover:border-gold/60 transition-all">
                {social.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-cream">{social.name}</h2>
                <p className="text-gold/60 text-sm">{social.handle}</p>
              </div>
              <svg className="w-5 h-5 text-gold/40 group-hover:text-gold/70 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center pt-6">
          <p className="tracking-widest uppercase text-gold/30 text-xs">GGinvestments</p>
        </footer>
      </div>
    </div>
  );
}
