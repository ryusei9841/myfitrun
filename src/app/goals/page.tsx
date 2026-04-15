import { redirect } from "next/navigation";
import Link from "next/link";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import GoalForm from "./GoalForm";

export default async function GoalsPage() {
  const session = await readSession();
  if (!session) redirect("/");

  const goal = await prisma.goal.findUnique({ where: { userId: session.userId } });

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-black">🎯 目標設定</h1>
          <p className="text-sm text-zinc-500 mt-1">
            目標を設定すると、AI コーチが目標達成に向けてパーソナライズされたアドバイスをくれます。
          </p>
        </div>

        <GoalForm
          initial={
            goal
              ? {
                  raceName: goal.raceName,
                  raceDate: goal.raceDate.toISOString().slice(0, 10),
                  distanceMeters: goal.distanceMeters,
                  targetTimeSeconds: goal.targetTimeSeconds,
                  notes: goal.notes ?? "",
                }
              : null
          }
        />
      </div>
    </main>
  );
}
