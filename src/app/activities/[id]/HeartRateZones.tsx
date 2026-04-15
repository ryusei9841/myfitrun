"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type ZoneSlice = {
  name: string;
  seconds: number;
  color: string;
};

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}分${String(s).padStart(2, "0")}秒`;
}

export default function HeartRateZones({ zones }: { zones: ZoneSlice[] }) {
  const total = zones.reduce((s, z) => s + z.seconds, 0);
  if (total === 0) return null;

  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
        心拍ゾーン分布
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={zones}
                dataKey="seconds"
                nameKey="name"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {zones.map((z, i) => (
                  <Cell key={i} fill={z.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v, name) => [fmt(Number(v)), name as string]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1 text-xs">
          {zones.map((z) => {
            const pct = total > 0 ? (z.seconds / total) * 100 : 0;
            return (
              <li key={z.name} className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ background: z.color }}
                />
                <span className="font-medium text-zinc-700 dark:text-zinc-300 w-12">
                  {z.name}
                </span>
                <span className="text-zinc-500 tabular-nums">{fmt(z.seconds)}</span>
                <span className="ml-auto text-zinc-400 tabular-nums">{pct.toFixed(0)}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
