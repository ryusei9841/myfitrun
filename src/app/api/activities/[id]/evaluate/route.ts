import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CLAUDE_MODEL, evaluateActivity, type GoalContext } from "@/lib/claude";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const activity = await prisma.activity.findFirst({
    where: { id, userId: session.userId },
    include: { evaluation: true },
  });
  if (!activity) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (activity.evaluation) {
    return NextResponse.json({ ok: true, evaluation: activity.evaluation, cached: true });
  }

  const goal = await prisma.goal.findUnique({ where: { userId: session.userId } });
  const goalCtx: GoalContext | null = goal
    ? {
        raceName: goal.raceName,
        raceDate: goal.raceDate,
        distanceMeters: goal.distanceMeters,
        targetTimeSeconds: goal.targetTimeSeconds,
        notes: goal.notes,
      }
    : null;

  const result = await evaluateActivity(
    {
      type: activity.type,
      name: activity.name,
      startDate: activity.startDate,
      distanceMeters: activity.distanceMeters,
      movingTimeSeconds: activity.movingTimeSeconds,
      totalElevationGain: activity.totalElevationGain,
      averageSpeed: activity.averageSpeed,
      averageHeartrate: activity.averageHeartrate,
      maxHeartrate: activity.maxHeartrate,
      averageCadence: activity.averageCadence,
      calories: activity.calories,
    },
    goalCtx
  );

  const evaluation = await prisma.evaluation.create({
    data: {
      activityId: activity.id,
      summary: result.summary,
      strengths: result.strengths,
      improvements: result.improvements,
      nextGoal: result.nextGoal,
      trainingPlan: result.trainingPlan,
      model: CLAUDE_MODEL,
    },
  });

  return NextResponse.json({ ok: true, evaluation, cached: false });
}
