// Strava API helpers

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";

export type StravaTokenResponse = {
  token_type: "Bearer";
  expires_at: number; // unix seconds
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete?: StravaAthlete;
};

export type StravaAthlete = {
  id: number;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  profile?: string | null;
};

export type StravaActivity = {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  calories?: number;
  [key: string]: unknown;
};

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: need("STRAVA_CLIENT_ID"),
    redirect_uri: need("STRAVA_REDIRECT_URI"),
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all,profile:read_all",
    state,
  });
  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: need("STRAVA_CLIENT_ID"),
      client_secret: need("STRAVA_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: need("STRAVA_CLIENT_ID"),
      client_secret: need("STRAVA_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type StravaStreamSet = {
  time?: { data: number[] };
  distance?: { data: number[] };
  heartrate?: { data: number[] };
  altitude?: { data: number[] };
  velocity_smooth?: { data: number[] };
  cadence?: { data: number[] };
};

export async function fetchActivityStreams(
  accessToken: string,
  activityId: number | bigint,
  keys: string[] = ["time", "distance", "heartrate", "altitude", "velocity_smooth", "cadence"]
): Promise<StravaStreamSet> {
  const params = new URLSearchParams({ keys: keys.join(","), key_by_type: "true" });
  const res = await fetch(
    `${STRAVA_API_BASE}/activities/${activityId}/streams?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );
  if (res.status === 404) return {};
  if (!res.ok) {
    throw new Error(`Strava streams fetch failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function fetchAthleteActivities(
  accessToken: string,
  opts: { perPage?: number; page?: number; after?: number } = {}
): Promise<StravaActivity[]> {
  const params = new URLSearchParams();
  params.set("per_page", String(opts.perPage ?? 30));
  params.set("page", String(opts.page ?? 1));
  if (opts.after) params.set("after", String(opts.after));

  const res = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Strava activities fetch failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
