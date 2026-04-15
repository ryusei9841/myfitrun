"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type StreamPoint = {
  km: number;
  hr?: number | null;
  altitude?: number | null;
  paceSecPerKm?: number | null;
};

function paceLabel(secPerKm: number | null | undefined): string {
  if (secPerKm == null || !isFinite(secPerKm) || secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"`;
}

const tickFontSize = 11;

export function HeartRateChart({ data }: { data: StreamPoint[] }) {
  if (!data.some((d) => d.hr != null)) return null;
  return (
    <ChartCard title="心拍" accent="#ef4444">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" vertical={false} opacity={0.25} />
          <XAxis
            dataKey="km"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => `${v.toFixed(1)}km`}
            tick={{ fontSize: tickFontSize, fill: "#71717a" }}
            stroke="#52525b"
          />
          <YAxis
            tick={{ fontSize: tickFontSize, fill: "#71717a" }}
            stroke="#52525b"
            domain={["dataMin - 5", "dataMax + 5"]}
            unit=""
          />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => `${Number(v).toFixed(2)} km`}
            formatter={(v) => [`${Math.round(Number(v))} bpm`, "心拍"]}
          />
          <Area
            type="monotone"
            dataKey="hr"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#hrGrad)"
            isAnimationActive={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ElevationChart({ data }: { data: StreamPoint[] }) {
  if (!data.some((d) => d.altitude != null)) return null;
  return (
    <ChartCard title="標高" accent="#10b981">
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="elGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" vertical={false} opacity={0.25} />
          <XAxis
            dataKey="km"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => `${v.toFixed(1)}km`}
            tick={{ fontSize: tickFontSize, fill: "#71717a" }}
            stroke="#52525b"
          />
          <YAxis
            tick={{ fontSize: tickFontSize, fill: "#71717a" }}
            stroke="#52525b"
            unit="m"
          />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => `${Number(v).toFixed(2)} km`}
            formatter={(v) => [`${Math.round(Number(v))} m`, "標高"]}
          />
          <Area
            type="monotone"
            dataKey="altitude"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#elGrad)"
            isAnimationActive={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PaceChart({ data }: { data: StreamPoint[] }) {
  if (!data.some((d) => d.paceSecPerKm != null)) return null;
  // Smaller pace = faster, so reverse Y axis visually
  return (
    <ChartCard title="ペース" accent="#FC4C02">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" vertical={false} opacity={0.25} />
          <XAxis
            dataKey="km"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => `${v.toFixed(1)}km`}
            tick={{ fontSize: tickFontSize, fill: "#71717a" }}
            stroke="#52525b"
          />
          <YAxis
            tick={{ fontSize: tickFontSize, fill: "#71717a" }}
            stroke="#52525b"
            reversed
            domain={["dataMin - 30", "dataMax + 30"]}
            tickFormatter={paceLabel}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => `${Number(v).toFixed(2)} km`}
            formatter={(v) => [`${paceLabel(Number(v))}/km`, "ペース"]}
          />
          <Line
            type="monotone"
            dataKey="paceSecPerKm"
            stroke="#FC4C02"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ChartCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: accent }} />
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h3>
      </div>
      {children}
    </div>
  );
}
