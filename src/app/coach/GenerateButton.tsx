"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function GenerateButton({ hasReport }: { hasReport: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach-report", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button
        onClick={onClick}
        disabled={loading || isPending}
        className="rounded-full bg-[#FC4C02] hover:bg-[#e34502] text-white text-sm font-bold px-5 py-2.5 disabled:opacity-50"
      >
        {loading ? "AI が分析中…" : hasReport ? "レポートを再生成" : "レポートを生成"}
      </button>
    </div>
  );
}
