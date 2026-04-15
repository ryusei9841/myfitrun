import type { StravaStreamSet } from "@/lib/strava";

export type StreamPoint = {
  km: number;
  hr?: number | null;
  altitude?: number | null;
  paceSecPerKm?: number | null;
};

/**
 * Convert raw Strava streams to chart points indexed by distance (km).
 * Downsamples to ~maxPoints to keep charts performant.
 */
export function buildStreamPoints(streams: StravaStreamSet, maxPoints = 200): StreamPoint[] {
  const distance = streams.distance?.data ?? [];
  if (distance.length === 0) return [];

  const hr = streams.heartrate?.data ?? [];
  const alt = streams.altitude?.data ?? [];
  const vel = streams.velocity_smooth?.data ?? [];

  const len = distance.length;
  const stride = Math.max(1, Math.floor(len / maxPoints));
  const points: StreamPoint[] = [];

  for (let i = 0; i < len; i += stride) {
    const v = vel[i];
    points.push({
      km: distance[i] / 1000,
      hr: hr[i] ?? null,
      altitude: alt[i] ?? null,
      paceSecPerKm: v && v > 0.3 ? 1000 / v : null,
    });
  }
  // Always include the last point
  if (points.length > 0 && points[points.length - 1].km !== distance[len - 1] / 1000) {
    const i = len - 1;
    const v = vel[i];
    points.push({
      km: distance[i] / 1000,
      hr: hr[i] ?? null,
      altitude: alt[i] ?? null,
      paceSecPerKm: v && v > 0.3 ? 1000 / v : null,
    });
  }
  return points;
}

export type ZoneSlice = {
  name: string;
  seconds: number;
  color: string;
};

/**
 * Compute time spent in 5 heart-rate zones based on % of max HR.
 * Uses Strava's standard zone boundaries (50/60/70/80/90% maxHR).
 */
export function computeHeartRateZones(
  streams: StravaStreamSet,
  maxHr: number
): ZoneSlice[] {
  const hr = streams.heartrate?.data ?? [];
  const time = streams.time?.data ?? [];
  if (hr.length === 0 || time.length === 0 || maxHr <= 0) return [];

  const bounds = [0.5, 0.6, 0.7, 0.8, 0.9, 1.01].map((p) => p * maxHr);
  const zones: ZoneSlice[] = [
    { name: "Z1", seconds: 0, color: "#94a3b8" },
    { name: "Z2", seconds: 0, color: "#38bdf8" },
    { name: "Z3", seconds: 0, color: "#22c55e" },
    { name: "Z4", seconds: 0, color: "#f59e0b" },
    { name: "Z5", seconds: 0, color: "#ef4444" },
  ];

  for (let i = 0; i < hr.length; i++) {
    const dt = i === 0 ? 0 : time[i] - time[i - 1];
    if (dt <= 0 || dt > 30) continue;
    const v = hr[i];
    if (v == null) continue;
    let idx = -1;
    for (let z = 0; z < 5; z++) {
      if (v >= bounds[z] && v < bounds[z + 1]) {
        idx = z;
        break;
      }
    }
    if (idx === -1 && v >= bounds[5] - 0.01) idx = 4;
    if (idx >= 0) zones[idx].seconds += dt;
  }
  return zones;
}
