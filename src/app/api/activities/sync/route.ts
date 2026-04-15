import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fetchAthleteActivities } from "@/lib/strava";
import { getValidAccessToken } from "@/lib/stravaUser";

const ALLOWED_TYPES = new Set(["Run", "Walk", "TrailRun", "VirtualRun"]);

export async function POST() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const accessToken = await getValidAccessToken(session.userId);
  const activities = await fetchAthleteActivities(accessToken, { perPage: 30, page: 1 });

  let inserted = 0;
  for (const a of activities) {
    if (!ALLOWED_TYPES.has(a.type)) continue;
    const result = await prisma.activity.upsert({
      where: { stravaActivityId: BigInt(a.id) },
      update: {},
      create: {
        userId: session.userId,
        stravaActivityId: BigInt(a.id),
        name: a.name,
        type: a.type,
        startDate: new Date(a.start_date),
        distanceMeters: a.distance,
        movingTimeSeconds: a.moving_time,
        elapsedTimeSeconds: a.elapsed_time,
        totalElevationGain: a.total_elevation_gain,
        averageSpeed: a.average_speed,
        maxSpeed: a.max_speed ?? null,
        averageHeartrate: a.average_heartrate ?? null,
        maxHeartrate: a.max_heartrate ?? null,
        averageCadence: a.average_cadence ?? null,
        calories: a.calories ?? null,
        rawJson: a as object,
      },
    });
    if (result.createdAt.getTime() > Date.now() - 5000) inserted++;
  }

  return NextResponse.json({ ok: true, fetched: activities.length, inserted });
}
