import { redirect } from "next/navigation";
import Link from "next/link";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import GenerateButton from "./GenerateButton";

function formatHMS(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function paceFrom(distM: number, totalSec: number): string {
  if (distM <= 0 || totalSec <= 0) return "—";
  const secPerKm = totalSec / (distM / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"/km`;
}

export default async function CoachPage() {
  const session = await readSession();
  if (!session) redirect("/");

  const [goal, report] = await Promise.all([
    prisma.goal.findUnique({ where: { userId: session.userId } }),
    prisma.coachReport.findUnique({ where: { userId: session.userId } }),
  ]);

  const daysToGoal = goal
    ? Math.max(0, Math.ceil((goal.raceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-black text-orange-600">
            myfitrun
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            ← ダッシュボード
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2">
              <span>🤖</span> AI コーチレポート
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              直近のアクティビティと目標から、Claude が総合的なコーチングを行います。
            </p>
          </div>
          <GenerateButton hasReport={!!report} />
        </div>

        {goal ? (
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-6 shadow-lg">
            <div className="text-xs uppercase tracking-wider opacity-80">現在の目標</div>
            <div className="text-2xl font-black mt-1">{goal.raceName}</div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="あと" value={`${daysToGoal} 日`} />
              <Stat
                label="距離"
                value={`${(goal.distanceMeters / 1000).toFixed(2)} km`}
              />
              <Stat label="目標タイム" value={formatHMS(goal.targetTimeSeconds)} />
              <Stat
                label="目標ペース"
                value={paceFrom(goal.distanceMeters, goal.targetTimeSeconds)}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center">
            <p className="text-zinc-500">目標がまだ設定されていません。</p>
            <Link
              href="/goals"
              className="inline-block mt-3 text-sm font-bold text-orange-600 hover:underline"
            >
              目標を設定する →
            </Link>
          </div>
        )}

        {report ? (
          <div className="space-y-4">
            <ReportCard
              title="現在の状況"
              icon="📊"
              color="from-orange-500 to-red-500"
              body={report.overview}
            />
            <ReportCard
              title="ペース戦略"
              icon="⏱️"
              color="from-cyan-500 to-blue-500"
              body={report.paceAdvice}
            />
            <ReportCard
              title="重点トレーニング"
              icon="💪"
              color="from-emerald-500 to-green-600"
              body={report.trainingFocus}
            />
            <ReportCard
              title="コーチからのメッセージ"
              icon="💬"
              color="from-purple-500 to-pink-600"
              body={report.motivation}
            />
            <p className="text-xs text-zinc-400 text-right">
              生成: {report.model} · {report.generatedAt.toLocaleString("ja-JP")}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
            <p className="text-zinc-500">
              まだレポートがありません。「レポートを生成」を押してください。
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs opacity-75">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function ReportCard({
  title,
  icon,
  color,
  body,
}: {
  title: string;
  icon: string;
  color: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div
        className={`bg-gradient-to-r ${color} px-5 py-3 text-white font-bold flex items-center gap-2`}
      >
        <span className="text-lg">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="p-5 bg-white dark:bg-zinc-900">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {body}
        </p>
      </div>
    </div>
  );
}
