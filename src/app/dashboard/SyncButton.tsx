"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setMsg(null);
    const res = await fetch("/api/activities/sync", { method: "POST" });
    if (!res.ok) {
      setMsg("同期に失敗しました");
      return;
    }
    const data = await res.json();
    setMsg(`${data.fetched} 件取得 / ${data.inserted} 件追加`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-zinc-500">{msg}</span>}
      <button
        onClick={onClick}
        disabled={isPending}
        className="rounded-full bg-[#FC4C02] hover:bg-[#e34502] text-white text-sm font-bold px-5 py-2 disabled:opacity-50"
      >
        {isPending ? "同期中…" : "Strava と同期"}
      </button>
    </div>
  );
}
