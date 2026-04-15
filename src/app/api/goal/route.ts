import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MAX_DISTANCE_METERS = 150_000;

type GoalBody = {
  raceName?: string;
  raceDate?: string;
  distanceMeters?: number;
  targetTimeSeconds?: number;
  notes?: string | null;
};

function validate(body: GoalBody): string | null {
  if (!body.raceName || typeof body.raceName !== "string" || body.raceName.trim().length === 0) {
    return "raceName is required";
  }
  if (!body.raceDate || isNaN(new Date(body.raceDate).getTime())) {
    return "raceDate must be a valid date";
  }
  if (
    typeof body.distanceMeters !== "number" ||
    !isFinite(body.distanceMeters) ||
    body.distanceMeters <= 0
  ) {
    return "distanceMeters must be > 0";
  }
  if (body.distanceMeters > MAX_DISTANCE_METERS) {
    return `distanceMeters must be <= ${MAX_DISTANCE_METERS} (150km)`;
  }
  if (
    typeof body.targetTimeSeconds !== "number" ||
    !Number.isInteger(body.targetTimeSeconds) ||
    body.targetTimeSeconds <= 0
  ) {
    return "targetTimeSeconds must be a positive integer";
  }
  return null;
}

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const goal = await prisma.goal.findUnique({ where: { userId: session.userId } });
  return NextResponse.json({ goal });
}

export async function PUT(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as GoalBody;
  const err = validate(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const goal = await prisma.goal.upsert({
    where: { userId: session.userId },
    update: {
      raceName: body.raceName!.trim(),
      raceDate: new Date(body.raceDate!),
      distanceMeters: body.distanceMeters!,
      targetTimeSeconds: body.targetTimeSeconds!,
      notes: body.notes ?? null,
    },
    create: {
      userId: session.userId,
      raceName: body.raceName!.trim(),
      raceDate: new Date(body.raceDate!),
      distanceMeters: body.distanceMeters!,
      targetTimeSeconds: body.targetTimeSeconds!,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json({ goal });
}

export async function DELETE() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await prisma.goal.deleteMany({ where: { userId: session.userId } });
  return NextResponse.json({ ok: true });
}
