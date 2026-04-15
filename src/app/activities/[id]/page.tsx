import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fetchActivityStreams } from "@/lib/strava";
import { getValidAccessToken } from "@/lib/stravaUser";
import { buildStreamPoints, computeHeartRateZones } from "@/lib/streams";
import EvaluateButton from "./EvaluateButton";
import { ElevationChart, HeartRateChart, PaceChart } from "./ActivityCharts";
import HeartRateZones from "./HeartRateZones";

function paceMinPerKm(speedMps: number): string {
  if (!speedMps || speedMps <= 0) return "—";
  const secPerKm = 1000 / speedMps;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"/km`;
}

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function ActivityDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/");

  const { id } = await params;
  const activity = await prisma.activity.findFirst({
    where: { id, userId: session.userId },
    include: { evaluation: true },
  });
  if (!activity) notFound();

  // Fetch time-series data from Strava (best-effort)
  let streamPoints: ReturnType<typeof buildStreamPoints> = [];
  let zones: ReturnType<typeof computeHeartRateZones> = [];
  try {
    const accessToken = await getValidAccessToken(session.userId);
    const streams = await fetchActivityStreams(accessToken, activity.stravaActivityId);
    streamPoints = buildStreamPoints(streams);
    if (activity.maxHeartrate) {
      zones = computeHeartRateZones(streams, activity.maxHeartrate);
    }
  } catch (e) {
    console.error("streams fetch failed", e);
  }

  const km = (activity.distanceMeters / 1000).toFixed(2);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-[#FC4C02] to-[#C2261A] text-white p-8 shadow-xl">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <span className="px-2 py-0.5 rounded-full bg-white/20 font-semibold">
              {activity.type}
            </span>
            <span>{activity.startDate.toLocaleString("ja-JP")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mt-2">{activity.name}</h1>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <HeroStat label="距離" value={km} unit="km" />
            <HeroStat label="時間" value={formatDuration(activity.movingTimeSeconds)} />
            <HeroStat label="平均ペース" value={paceMinPerKm(activity.averageSpeed)} />
            <HeroStat
              label="獲得標高"
              value={String(Math.round(activity.totalElevationGain))}
              unit="m"
            />
          </div>
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="平均心拍"
            value={activity.averageHeartrate ? Math.round(activity.averageHeartrate) : null}
            unit="bpm"
            color="#ef4444"
          />
          <MetricCard
            label="最大心拍"
            value={activity.maxHeartrate ? Math.round(activity.maxHeartrate) : null}
            unit="bpm"
            color="#ef4444"
          />
          <MetricCard
            label="ケイデンス"
            value={activity.averageCadence ? Math.round(activity.averageCadence * 2) : null}
            unit="spm"
            color="#8b5cf6"
          />
          <MetricCard
            label="カロリー"
            value={activity.calories ? Math.round(activity.calories) : null}
            unit="kcal"
            color="#f59e0b"
          />
        </div>

        {/* Charts */}
        {streamPoints.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HeartRateChart data={streamPoints} />
            <PaceChart data={streamPoints} />
            <ElevationChart data={streamPoints} />
            {zones.length > 0 && <HeartRateZones zones={zones} />}
          </div>
        )}

        {/* AI Evaluation */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>🤖</span> AI コーチ評価
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Powered by Claude</p>
            </div>
            {!activity.evaluation && <EvaluateButton activityId={activity.id} />}
          </div>

          {activity.evaluation ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <EvalCard
                title="全体評価"
                body={activity.evaluation.summary}
                color="from-orange-500 to-red-500"
                icon="📊"
                wide
              />
              <EvalCard
                title="良かった点"
                body={activity.evaluation.strengths}
                color="from-emerald-500 to-green-600"
                icon="✨"
              />
              <EvalCard
                title="改善点"
                body={activity.evaluation.improvements}
                color="from-amber-500 to-orange-500"
                icon="🎯"
              />
              <EvalCard
                title="次の目標"
                body={activity.evaluation.nextGoal}
                color="from-blue-500 to-indigo-600"
                icon="🚀"
                wide
              />
              <EvalCard
                title="今週の練習メニュー"
                body={activity.evaluation.trainingPlan}
                color="from-purple-500 to-pink-600"
                icon="📅"
                wide
              />
              <p className="md:col-span-2 text-xs text-zinc-400 text-right">
                生成: {activity.evaluation.model} ·{" "}
                {activity.evaluation.createdAt.toLocaleString("ja-JP")}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              「評価する」を押すと Claude があなたのアクティビティを分析します。
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function HeroStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider opacity-75">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl sm:text-4xl font-black tabular-nums">{value}</span>
        {unit && <span className="text-sm font-semibold opacity-90">{unit}</span>}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number | null;
  unit: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums">{value ?? "—"}</span>
        {value != null && <span className="text-xs text-zinc-500">{unit}</span>}
      </div>
    </div>
  );
}

function EvalCard({
  title,
  body,
  color,
  icon,
  wide,
}: {
  title: string;
  body: string;
  color: string;
  icon: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <div className={`bg-gradient-to-r ${color} px-4 py-2 text-white font-bold flex items-center gap-2`}>
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="p-4 bg-white dark:bg-zinc-900">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {body}
        </p>
      </div>
    </div>
  );
}
