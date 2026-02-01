"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

interface User {
  businessName: string;
}

export default function StoragePage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [hasData, setHasData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logText, setLogText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
      loadData();
    } catch {
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadData = async () => {
    try {
      const response = await fetch("/api/storage");
      const data = await response.json();
      setColumns(data.columns || []);
      setRows(data.rows || []);
      setHasData(data.hasData || false);
    } catch {
      // No data yet
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/storage", {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setSuccess(`Imported ${data.rows} rows with ${data.columns} columns`);
      setTimeout(() => setSuccess(""), 3000);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAIUpdate = async () => {
    if (!logText.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ai_update",
          text: logText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Update failed");
      }

      setLogText("");
      setSuccess(data.explanation || "Updated successfully!");
      setTimeout(() => setSuccess(""), 4000);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (rows.length === 0) return;

    // Create CSV with proper encoding
    const csvContent = [
      columns.join(","),
      ...rows.map(row => 
        columns.map(col => {
          const val = row[col] || "";
          // Escape quotes and wrap in quotes if contains comma
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "three-seconds-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Count missing values per column
  const getMissingCount = () => {
    const missing: Record<string, number> = {};
    columns.forEach(col => {
      missing[col] = rows.filter(row => !row[col] || row[col].trim() === "").length;
    });
    return missing;
  };

  const missingCounts = getMissingCount();
  const totalMissing = Object.values(missingCounts).reduce((a, b) => a + b, 0);

  if (checkingAuth) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-gold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background classic-pattern overflow-hidden flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-7xl mx-auto px-4 py-3 w-full overflow-hidden">
        <AppHeader businessName={user?.businessName} />

        {/* Status Messages */}
        {error && (
          <div className="mb-2 p-2 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm shrink-0">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-2 p-2 rounded-lg bg-green-900/20 border border-green-500/30 text-green-400 text-sm shrink-0">
            {success}
          </div>
        )}

        {!hasData ? (
          /* Empty State - Upload Prompt */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-5xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-cream mb-2">Upload Your Spreadsheet</h2>
              <p className="text-muted text-sm mb-6">
                Upload your Excel or CSV file. We&apos;ll preserve your exact column structure.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-light text-forest font-semibold hover:opacity-90 transition-all"
              >
                {isLoading ? "Uploading..." : "Upload Excel / CSV"}
              </button>
            </div>
          </div>
        ) : (
          /* Data View */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-3">
            {/* Top Bar */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-cream">📊 Your Data</h2>
                <span className="text-xs text-muted">{rows.length} rows × {columns.length} columns</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-gold/20 text-gold/70 text-xs hover:text-gold hover:border-gold/40 transition-all"
                >
                  📤 Re-upload
                </button>
                <button
                  onClick={handleExport}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-gold/20 text-gold/70 text-xs hover:text-gold hover:border-gold/40 transition-all"
                >
                  📥 Export CSV
                </button>
              </div>
            </div>

            {/* Missing Data Alert */}
            {totalMissing > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-500/40 rounded-lg p-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">⚠️</span>
                  <span className="text-yellow-200 text-sm">
                    {totalMissing} empty cells in your data
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {Object.entries(missingCounts)
                    .filter(([, count]) => count > 0)
                    .slice(0, 3)
                    .map(([col, count]) => (
                      <span key={col} className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[10px]">
                        {col}: {count}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* AI Input */}
            <div className="flex gap-2 shrink-0">
              <input
                type="text"
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAIUpdate()}
                placeholder="Tell the AI to update your data... e.g., 'Add 500 likes to the IPO video' or 'The POV video got 1.2k views'"
                className="flex-1 px-4 py-2 bg-surface rounded-lg border border-border/30 text-cream placeholder-muted/50 focus:border-gold/50 focus:outline-none text-sm"
              />
              <button
                onClick={handleAIUpdate}
                disabled={isLoading || !logText.trim()}
                className="px-4 py-2 rounded-lg bg-gold/10 border border-gold/30 text-gold text-sm font-medium hover:bg-gold/20 transition-all disabled:opacity-50"
              >
                {isLoading ? "..." : "Update"}
              </button>
            </div>

            {/* Spreadsheet Table */}
            <div className="flex-1 bg-surface rounded-xl border border-border/50 overflow-hidden">
              <div className="overflow-auto h-full">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-surface z-10">
                    <tr>
                      <th className="py-2 px-2 text-left text-gold/60 font-medium border-b border-border/30 w-8">#</th>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="py-2 px-2 text-left text-gold/80 font-medium border-b border-border/30 whitespace-nowrap"
                        >
                          {col}
                          {missingCounts[col] > 0 && (
                            <span className="ml-1 text-yellow-400 text-[9px]">({missingCounts[col]})</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-surface-light/30 border-b border-border/10">
                        <td className="py-1.5 px-2 text-muted">{rowIdx + 1}</td>
                        {columns.map((col) => {
                          const value = row[col];
                          const isEmpty = !value || value.trim() === "";
                          return (
                            <td
                              key={col}
                              className={`py-1.5 px-2 ${
                                isEmpty ? "bg-yellow-500/5" : ""
                              }`}
                            >
                              {isEmpty ? (
                                <span className="text-yellow-500/40">-</span>
                              ) : (
                                <span className="text-cream/90">{value}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
