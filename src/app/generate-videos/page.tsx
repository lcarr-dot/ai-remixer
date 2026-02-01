"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

interface User {
  businessName: string;
}

export default function GenerateVideosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [duration, setDuration] = useState("60");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isParsingFile, setIsParsingFile] = useState(false);
  
  // Generated content states
  const [hooks, setHooks] = useState<string[]>([]);
  const [script, setScript] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  
  // Loading states
  const [loadingHook, setLoadingHook] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);
  const [loadingCaption, setLoadingCaption] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  
  const [error, setError] = useState("");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setUser(data.user);
    } catch {
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsParsingFile(true);
    setError("");

    try {
      // Send file to API to extract text
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-file", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse file");
      }

      // Put the extracted text into the topic field
      setTopic(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
      setUploadedFileName("");
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const generateContent = async (type: "hook" | "script" | "caption" | "all") => {
    if (!topic.trim()) {
      setError("Please enter a topic or upload a file");
      return;
    }

    setError("");
    
    if (type === "all") setLoadingAll(true);
    else if (type === "hook") setLoadingHook(true);
    else if (type === "script") setLoadingScript(true);
    else if (type === "caption") setLoadingCaption(true);

    try {
      const response = await fetch("/api/generate-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform,
          duration: parseInt(duration),
          generateType: type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      // Update the appropriate state based on what was generated
      if (type === "all" || type === "hook") {
        if (data.hooks) setHooks(data.hooks);
      }
      if (type === "all" || type === "script") {
        if (data.script) setScript(data.script);
      }
      if (type === "all" || type === "caption") {
        if (data.caption) setCaption(data.caption);
        if (data.hashtags) setHashtags(data.hashtags);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoadingAll(false);
      setLoadingHook(false);
      setLoadingScript(false);
      setLoadingCaption(false);
    }
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      setError("Failed to copy");
    }
  };

  const clearTopic = () => {
    setTopic("");
    setUploadedFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (checkingAuth) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-gold">Loading...</div>
      </div>
    );
  }

  const isLoading = loadingHook || loadingScript || loadingCaption || loadingAll;

  return (
    <div className="h-screen bg-background classic-pattern overflow-hidden flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-4 py-3 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto w-full shrink-0">
          <AppHeader businessName={user?.businessName} />
        </div>

        {/* Value Prop Banner */}
        <div className="max-w-7xl mx-auto w-full shrink-0">
          <div className="bg-gold/10 border border-gold/30 rounded-lg p-2 mb-3 text-center">
            <p className="text-xs text-gold">
              ✨ We use your past video data to generate <strong>viral hooks, scripts & captions</strong> tailored to your niche.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-2 p-2 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm shrink-0 max-w-7xl mx-auto w-full">
            {error}
          </div>
        )}

        <div className="flex-1 grid lg:grid-cols-2 gap-4 min-h-0 overflow-hidden px-2">
          {/* Input Panel - Left Side */}
          <div className="bg-surface rounded-xl border border-border/50 p-5 elegant-border overflow-auto">
            <h2 className="text-sm font-semibold text-cream mb-3">🎬 What&apos;s the video about?</h2>

            <div className="space-y-3">
              {/* Topic Input with File Upload Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-medium text-gold/80 uppercase tracking-wider">
                    Topic / Idea {uploadedFileName && <span className="text-green-400">({uploadedFileName})</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    {topic && (
                      <button
                        onClick={clearTopic}
                        className="text-[10px] text-red-400 hover:text-red-300"
                      >
                        Clear
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isParsingFile}
                      className="text-[10px] px-2 py-0.5 rounded bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-all disabled:opacity-50"
                    >
                      {isParsingFile ? "Reading..." : "📄 Upload PDF"}
                    </button>
                  </div>
                </div>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={isParsingFile ? "Extracting text from file..." : "Describe your video idea or upload a PDF to auto-fill..."}
                  rows={6}
                  disabled={isParsingFile}
                  className="w-full px-3 py-2 bg-surface-light rounded-lg border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none resize-none text-sm disabled:opacity-50"
                />
              </div>

              {/* Platform & Duration */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gold/80 uppercase tracking-wider mb-1">
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-light rounded-lg border border-border/30 text-cream focus:border-gold/50 focus:outline-none text-sm"
                  >
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="shorts">YT Shorts</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gold/80 uppercase tracking-wider mb-1">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-light rounded-lg border border-border/30 text-cream focus:border-gold/50 focus:outline-none text-sm"
                  >
                    <option value="15">15 sec</option>
                    <option value="30">30 sec</option>
                    <option value="60">60 sec</option>
                    <option value="90">90 sec</option>
                    <option value="180">3 min</option>
                  </select>
                </div>
              </div>

              {/* Generate Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => generateContent("all")}
                  disabled={isLoading || isParsingFile}
                  className={`w-full py-3 rounded-xl font-semibold uppercase tracking-wide transition-all text-sm ${
                    loadingAll
                      ? "bg-gold/50 cursor-not-allowed text-forest"
                      : "bg-gradient-to-r from-gold to-gold-light hover:opacity-90 text-forest"
                  }`}
                >
                  {loadingAll ? "Generating..." : "✨ Generate All"}
                </button>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => generateContent("hook")}
                    disabled={isLoading || isParsingFile}
                    className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                      loadingHook
                        ? "bg-gold/20 border-gold/30 text-gold/50 cursor-not-allowed"
                        : "bg-surface border-gold/30 text-gold hover:bg-gold/10"
                    }`}
                  >
                    {loadingHook ? "..." : "🎣 Hook"}
                  </button>
                  <button
                    onClick={() => generateContent("script")}
                    disabled={isLoading || isParsingFile}
                    className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                      loadingScript
                        ? "bg-gold/20 border-gold/30 text-gold/50 cursor-not-allowed"
                        : "bg-surface border-gold/30 text-gold hover:bg-gold/10"
                    }`}
                  >
                    {loadingScript ? "..." : "📝 Script"}
                  </button>
                  <button
                    onClick={() => generateContent("caption")}
                    disabled={isLoading || isParsingFile}
                    className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                      loadingCaption
                        ? "bg-gold/20 border-gold/30 text-gold/50 cursor-not-allowed"
                        : "bg-surface border-gold/30 text-gold hover:bg-gold/10"
                    }`}
                  >
                    {loadingCaption ? "..." : "💬 Caption"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Output Panel - Right Side */}
          <div className="grid grid-rows-3 gap-3 min-h-0 overflow-hidden">
            {/* Hooks Box */}
            <div className="bg-surface rounded-xl border border-border/50 p-4 elegant-border overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="text-xs font-semibold text-gold flex items-center gap-1">
                  🎣 Hooks
                  {hooks.length > 0 && <span className="text-gold/50">({hooks.length})</span>}
                </h3>
                {hooks.length > 0 && (
                  <button
                    onClick={() => copyToClipboard(hooks.join("\n\n"), "hooks")}
                    className={`text-[10px] px-2 py-0.5 rounded ${
                      copiedSection === "hooks"
                        ? "bg-green-900/30 text-green-400"
                        : "bg-surface-light text-gold/70 hover:text-gold"
                    }`}
                  >
                    {copiedSection === "hooks" ? "✓ Copied" : "Copy All"}
                  </button>
                )}
              </div>
              {hooks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted text-xs">
                  Click &quot;Generate All&quot; or &quot;Hook&quot; to create hooks
                </div>
              ) : (
                <div className="flex-1 overflow-auto space-y-1">
                  {hooks.map((hook, i) => (
                    <div
                      key={i}
                      className="p-2 bg-surface-light rounded-lg text-xs text-cream/90 flex items-start justify-between gap-2"
                    >
                      <span><span className="text-gold font-bold">{i + 1}.</span> {hook}</span>
                      <button
                        onClick={() => copyToClipboard(hook, `hook-${i}`)}
                        className="text-[10px] text-gold/50 hover:text-gold shrink-0"
                      >
                        📋
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Script Box */}
            <div className="bg-surface rounded-xl border border-border/50 p-4 elegant-border overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="text-xs font-semibold text-gold">📝 Script</h3>
                {script && (
                  <button
                    onClick={() => copyToClipboard(script, "script")}
                    className={`text-[10px] px-2 py-0.5 rounded ${
                      copiedSection === "script"
                        ? "bg-green-900/30 text-green-400"
                        : "bg-surface-light text-gold/70 hover:text-gold"
                    }`}
                  >
                    {copiedSection === "script" ? "✓ Copied" : "Copy"}
                  </button>
                )}
              </div>
              {!script ? (
                <div className="flex-1 flex items-center justify-center text-muted text-xs">
                  Click &quot;Generate All&quot; or &quot;Script&quot; to create a script
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <div className="p-2 bg-surface-light rounded-lg text-xs text-cream/90 whitespace-pre-wrap">
                    {script}
                  </div>
                </div>
              )}
            </div>

            {/* Caption & Hashtags Box */}
            <div className="bg-surface rounded-xl border border-border/50 p-4 elegant-border overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="text-xs font-semibold text-gold">💬 Caption & Hashtags</h3>
                {caption && (
                  <button
                    onClick={() => copyToClipboard(`${caption}\n\n${hashtags.map(t => `#${t}`).join(" ")}`, "caption")}
                    className={`text-[10px] px-2 py-0.5 rounded ${
                      copiedSection === "caption"
                        ? "bg-green-900/30 text-green-400"
                        : "bg-surface-light text-gold/70 hover:text-gold"
                    }`}
                  >
                    {copiedSection === "caption" ? "✓ Copied" : "Copy All"}
                  </button>
                )}
              </div>
              {!caption ? (
                <div className="flex-1 flex items-center justify-center text-muted text-xs">
                  Click &quot;Generate All&quot; or &quot;Caption&quot; to create a caption
                </div>
              ) : (
                <div className="flex-1 overflow-auto space-y-2">
                  <div className="p-2 bg-surface-light rounded-lg text-xs text-cream/90">
                    {caption}
                  </div>
                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {hashtags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[10px] bg-gold/10 text-gold border border-gold/20"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
