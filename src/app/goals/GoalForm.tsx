"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESETS = [
  { label: "5 km", meters: 5000 },
  { label: "10 km", meters: 10000 },
  { label: "ハーフ", meters: 21097.5 },
  { label: "フル", meters: 42195 },
];

const MAX_METERS = 150_000;

type Initial = {
  raceName: string;
  raceDate: string;
  distanceMeters: number;
  targetTimeSeconds: number;
  notes: string;
};

function secondsToHms(s: number): { h: string; m: string; s: string } {
  return {
    h: String(Math.floor(s / 3600)),
    m: String(Math.floor((s % 3600) / 60)),
    s: String(s % 60),
  };
}

function paceFrom(distM: number, totalSec: number): string {
  if (distM <= 0 || totalSec <= 0) return "—";
  const secPerKm = totalSec / (distM / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"/km`;
}

export default function GoalForm({ initial }: { initial: Initial | null }) {
  const router = useRouter();
  const [raceName, setRaceName] = useState(initial?.raceName ?? "");
  const [raceDate, setRaceDate] = useState(initial?.raceDate ?? "");
  const [distanceKm, setDistanceKm] = useState<string>(
    initial ? (initial.distanceMeters / 1000).toString() : "10"
  );
  const initHms = secondsToHms(initial?.targetTimeSeconds ?? 0);
  const [hours, setHours] = useState(initHms.h);
  const [minutes, setMinutes] = useState(initHms.m);
  const [seconds, setSeconds] = useState(initHms.s);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const distanceMeters = Math.round(Number(distanceKm) * 1000);
  const targetTimeSeconds =
    (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);

  const distanceValid =
    isFinite(distanceMeters) && distanceMeters > 0 && distanceMeters <= MAX_METERS;
  const timeValid = targetTimeSeconds > 0;
  const formValid =
    raceName.trim().length > 0 && raceDate.length > 0 && distanceValid && timeValid;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!formValid) return;
    setBusy(true);
    try {
      const res = await fetch("/api/goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raceName: raceName.trim(),
          raceDate,
          distanceMeters,
          targetTimeSeconds,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("目標を削除しますか？")) return;
    setBusy(true);
    try {
      await fetch("/api/goal", { method: "DELETE" });
      router.refresh();
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-5"
    >
      <Field label="大会 / 目標名" required>
        <input
          type="text"
          value={raceName}
          onChange={(e) => setRaceName(e.target.value)}
          placeholder="例: 東京マラソン2026"
          className="input"
          maxLength={100}
        />
      </Field>

      <Field label="目標日" required>
        <input
          type="date"
          value={raceDate}
          onChange={(e) => setRaceDate(e.target.value)}
          className="input"
        />
      </Field>

      <Field label="距離 (km)" required hint="最大 150 km">
        <div className="flex flex-wrap gap-2 mb-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setDistanceKm((p.meters / 1000).toString())}
              className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs hover:bg-orange-100 dark:hover:bg-orange-900/30"
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="number"
          step="0.01"
          min="0.1"
          max="150"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
          className="input"
        />
        {!distanceValid && distanceKm.length > 0 && (
          <p className="text-xs text-red-500 mt-1">0 より大きく 150 km 以下を入力してください</p>
        )}
      </Field>

      <Field label="目標タイム" required>
        <div className="flex items-center gap-2">
          <TimeInput value={hours} onChange={setHours} max={99} />
          <span className="text-zinc-500">時間</span>
          <TimeInput value={minutes} onChange={setMinutes} max={59} />
          <span className="text-zinc-500">分</span>
          <TimeInput value={seconds} onChange={setSeconds} max={59} />
          <span className="text-zinc-500">秒</span>
        </div>
        {timeValid && distanceValid && (
          <p className="text-xs text-orange-600 mt-2 font-semibold">
            目標ペース: {paceFrom(distanceMeters, targetTimeSeconds)}
          </p>
        )}
      </Field>

      <Field label="メモ (任意)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="目標に対する想い、トレーニング方針など"
          className="input"
        />
      </Field>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {initial ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            目標を削除
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={!formValid || busy}
          className="rounded-full bg-[#FC4C02] hover:bg-[#e34502] text-white font-bold px-6 py-2.5 disabled:opacity-50"
        >
          {busy ? "保存中…" : initial ? "目標を更新" : "目標を設定"}
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.6rem 0.8rem;
          border-radius: 0.5rem;
          border: 1px solid rgb(212 212 216);
          background: white;
          font-size: 0.95rem;
          color: rgb(24 24 27);
        }
        :global(.dark) .input {
          background: rgb(24 24 27);
          border-color: rgb(63 63 70);
          color: rgb(244 244 245);
        }
        .input:focus {
          outline: none;
          border-color: #fc4c02;
          box-shadow: 0 0 0 3px rgba(252, 76, 2, 0.15);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5 text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {hint && <span className="ml-2 text-xs font-normal text-zinc-500">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function TimeInput({
  value,
  onChange,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  max: number;
}) {
  return (
    <input
      type="number"
      min="0"
      max={max}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-16 px-2 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-center tabular-nums"
    />
  );
}
