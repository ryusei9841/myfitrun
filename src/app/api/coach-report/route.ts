import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CLAUDE_MODEL, generateCoachReport, type GoalContext } from "@/lib/claude";

export async function POST() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [goal, activities] = await Promise.all([
    prisma.goal.findUnique({ where: { userId: session.userId } }),
    prisma.activity.findMany({
      where: { userId: session.userId },
      orderBy: { startDate: "desc" },
      take: 20,
    }),
  ]);

  const goalCtx: GoalContext | null = goal
    ? {
        raceName: goal.raceName,
        raceDate: goal.raceDate,
        distanceMeters: goal.distanceMeters,
        targetTimeSeconds: goal.targetTimeSeconds,
        notes: goal.notes,
      }
    : null;

  const result = await generateCoachReport({
    goal: goalCtx,
    recentActivities: activities.map((a) => ({
      startDate: a.startDate,
      type: a.type,
      distanceMeters: a.distanceMeters,
      movingTimeSeconds: a.movingTimeSeconds,
      averageSpeed: a.averageSpeed,
      averageHeartrate: a.averageHeartrate,
      totalElevationGain: a.totalElevationGain,
    })),
  });

  const report = await prisma.coachReport.upsert({
    where: { userId: session.userId },
    update: {
      overview: result.overview,
      paceAdvice: result.paceAdvice,
      trainingFocus: result.trainingFocus,
      motivation: result.motivation,
      model: CLAUDE_MODEL,
      generatedAt: new Date(),
    },
    create: {
      userId: session.userId,
      overview: result.overview,
      paceAdvice: result.paceAdvice,
      trainingFocus: result.trainingFocus,
      motivation: result.motivation,
      model: CLAUDE_MODEL,
    },
  });

  return NextResponse.json({ ok: true, report });
}
