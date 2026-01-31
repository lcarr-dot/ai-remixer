"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface KnowledgeItem {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  size: number;
}

export default function AdminPage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchKnowledgeBase();
  }, []);

  const fetchKnowledgeBase = async () => {
    try {
      const response = await fetch("/api/knowledge-base");
      const data = await response.json();
      setItems(data.items || []);
    } catch {
      setError("Failed to load knowledge base");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setSuccess(`"${file.name}" added to knowledge base`);
      fetchKnowledgeBase();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" from knowledge base?`)) return;

    try {
      const response = await fetch(`/api/knowledge-base?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setSuccess(`"${name}" removed from knowledge base`);
      fetchKnowledgeBase();
    } catch {
      setError("Failed to delete item");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-background classic-pattern">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12">
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
            <span className="gold-text">Knowledge Base</span>
          </h1>
          <p className="text-muted">
            Upload documents to give the AI context about your channel, metrics, and style.
          </p>
        </header>

        {/* Upload Section */}
        <div className="bg-surface rounded-2xl border border-border/50 p-6 mb-8 elegant-border">
          <h2 className="text-lg font-semibold text-cream mb-4">Add to Knowledge Base</h2>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv,.txt"
              onChange={handleUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`flex-1 py-4 px-6 rounded-xl border-2 border-dashed border-border/50 hover:border-gold/50 text-center cursor-pointer transition-all ${
                isUploading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isUploading ? (
                <span className="text-muted">Uploading...</span>
              ) : (
                <>
                  <span className="text-2xl block mb-1">📤</span>
                  <span className="text-cream/80">Click to upload</span>
                  <span className="text-sm text-muted block">PDF, Excel, CSV, or Text</span>
                </>
              )}
            </label>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 rounded-lg bg-green-900/20 border border-green-500/30 text-green-400 text-sm">
              {success}
            </div>
          )}
        </div>

        {/* Knowledge Base Items */}
        <div className="bg-surface rounded-2xl border border-border/50 p-6 elegant-border">
          <h2 className="text-lg font-semibold text-cream mb-4">
            Stored Documents ({items.length})
          </h2>

          {isLoading ? (
            <div className="text-center py-12 text-muted">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-40">📚</div>
              <p className="text-muted">No documents in knowledge base</p>
              <p className="text-sm text-muted/70">Upload your first document above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-surface-light border border-border/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                      {item.type === "pdf" ? "📄" : item.type === "excel" ? "📊" : "📝"}
                    </div>
                    <div>
                      <p className="font-medium text-cream">{item.name}</p>
                      <p className="text-sm text-muted">
                        {formatSize(item.size)} • {formatDate(item.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-900/20 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 p-4 rounded-xl bg-gold/5 border border-gold/20">
          <h3 className="text-sm font-semibold text-gold mb-2">How it works</h3>
          <p className="text-sm text-muted">
            Documents you upload here become part of the AI&apos;s context. When you remix content,
            the AI will reference your video metrics, past content style, and channel data
            to create more personalized and on-brand outputs.
          </p>
        </div>
      </div>
    </div>
  );
}
