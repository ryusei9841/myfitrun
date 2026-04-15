import { redirect } from "next/navigation";
import Link from "next/link";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import SyncButton from "./SyncButton";

function paceMinPerKm(speedMps: number): string {
  if (!speedMps || speedMps <= 0) return "—";
  const secPerKm = 1000 / speedMps;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"/km`;
}

function paceFromTimeAndDistance(distM: number, totalSec: number): string {
  if (distM <= 0 || totalSec <= 0) return "—";
  const secPerKm = totalSec / (distM / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"/km`;
}

function formatHMS(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function Dashboard() {
  const session = await readSession();
  if (!session) redirect("/");

  const [user, goal, activities] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.goal.findUnique({ where: { userId: session.userId } }),
    prisma.activity.findMany({
      where: { userId: session.userId },
      orderBy: { startDate: "desc" },
      take: 30,
      include: { evaluation: true },
    }),
  ]);

  const daysToGoal = goal
    ? Math.max(0, Math.ceil((goal.raceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-orange-600 shrink-0">myfitrun</h1>
          <nav className="flex items-center gap-1 sm:gap-4 text-sm">
            <Link
              href="/goals"
              className="px-2 sm:px-0 py-1 text-zinc-600 hover:text-orange-600 dark:text-zinc-400 flex items-center gap-1"
              aria-label="目標"
            >
              <span>🎯</span>
              <span className="hidden sm:inline">目標</span>
            </Link>
            <Link
              href="/coach"
              className="px-2 sm:px-0 py-1 text-zinc-600 hover:text-orange-600 dark:text-zinc-400 flex items-center gap-1"
              aria-label="AI コーチ"
            >
              <span>🤖</span>
              <span className="hidden sm:inline">コーチ</span>
            </Link>
            <span className="hidden md:inline text-zinc-600 dark:text-zinc-400 ml-2">
              {user?.firstName} {user?.lastName}
            </span>
            <form action="/api/auth/logout" method="post" className="ml-1">
              <button
                className="px-2 py-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                aria-label="ログアウト"
                title="ログアウト"
              >
                <span className="hidden sm:inline">ログアウト</span>
                <span className="sm:hidden text-lg">⏻</span>
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Goal card */}
        {goal ? (
          <Link href="/goals" className="block group">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-6 shadow-lg group-hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider opacity-80">🎯 目標</div>
                  <div className="text-2xl font-black mt-1">{goal.raceName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-80">あと</div>
                  <div className="text-3xl font-black tabular-nums">
                    {daysToGoal}
                    <span className="text-base font-bold ml-1">日</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <Stat label="距離" value={`${(goal.distanceMeters / 1000).toFixed(2)} km`} />
                <Stat label="目標タイム" value={formatHMS(goal.targetTimeSeconds)} />
                <Stat
                  label="目標ペース"
                  value={paceFromTimeAndDistance(goal.distanceMeters, goal.targetTimeSeconds)}
                />
              </div>
            </div>
          </Link>
        ) : (
          <Link
            href="/goals"
            className="block rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center hover:border-orange-400 transition-colors"
          >
            <div className="text-2xl">🎯</div>
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mt-1">
              目標を設定する
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              目標を設定すると AI コーチが達成に向けたアドバイスをくれます
            </p>
          </Link>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">最近のアクティビティ</h2>
            <SyncButton />
          </div>

          {activities.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
              <p className="text-zinc-500">まだアクティビティがありません。</p>
              <p className="text-zinc-500 text-sm mt-1">
                「同期」ボタンで Strava から取得してください。
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 hover:border-orange-400 transition-colors"
                >
                  <Link href={`/activities/${a.id}`} className="block">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="font-semibold truncate">{a.name}</div>
                      <div className="text-xs text-zinc-500 shrink-0">
                        {a.startDate.toLocaleString("ja-JP")}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                      <span>{a.type}</span>
                      <span>{(a.distanceMeters / 1000).toFixed(2)} km</span>
                      <span>{Math.round(a.movingTimeSeconds / 60)} 分</span>
                      <span>{paceMinPerKm(a.averageSpeed)}</span>
                      <span>↑ {Math.round(a.totalElevationGain)} m</span>
                      {a.evaluation && (
                        <span className="ml-auto text-orange-600 font-medium">AI評価済み ✓</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs opacity-75">{label}</div>
      <div className="text-lg font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
