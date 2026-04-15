import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { buildAuthorizeUrl } from "@/lib/strava";

export async function GET() {
  const state = randomBytes(16).toString("hex");
  const url = buildAuthorizeUrl(state);

  const jar = await cookies();
  jar.set("strava_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(url);
}
