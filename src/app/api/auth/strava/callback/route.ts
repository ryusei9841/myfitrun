import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken } from "@/lib/strava";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/session";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/?error=missing_code", req.url));
  }

  const jar = await cookies();
  const expectedState = jar.get("strava_oauth_state")?.value;
  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(new URL("/?error=state_mismatch", req.url));
  }
  jar.delete("strava_oauth_state");

  const token = await exchangeCodeForToken(code);
  const athlete = token.athlete;
  if (!athlete) {
    return NextResponse.redirect(new URL("/?error=no_athlete", req.url));
  }

  const user = await prisma.user.upsert({
    where: { stravaAthleteId: BigInt(athlete.id) },
    update: {
      username: athlete.username ?? undefined,
      firstName: athlete.firstname ?? undefined,
      lastName: athlete.lastname ?? undefined,
      profileImageUrl: athlete.profile ?? undefined,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiresAt: new Date(token.expires_at * 1000),
    },
    create: {
      stravaAthleteId: BigInt(athlete.id),
      username: athlete.username ?? undefined,
      firstName: athlete.firstname ?? undefined,
      lastName: athlete.lastname ?? undefined,
      profileImageUrl: athlete.profile ?? undefined,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiresAt: new Date(token.expires_at * 1000),
    },
  });

  const sessionToken = await createSession({ userId: user.id });
  await setSessionCookie(sessionToken);

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
