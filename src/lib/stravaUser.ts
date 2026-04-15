import { prisma } from "@/lib/prisma";
import { refreshAccessToken } from "@/lib/strava";

/**
 * Returns a valid Strava access token for the user, refreshing if needed.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const now = Date.now();
  // refresh if expiring in next 60 seconds
  if (user.tokenExpiresAt.getTime() - now > 60_000) {
    return user.accessToken;
  }
  const refreshed = await refreshAccessToken(user.refreshToken);
  await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      tokenExpiresAt: new Date(refreshed.expires_at * 1000),
    },
  });
  return refreshed.access_token;
}
