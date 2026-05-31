"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PieSlice {
  name: string;
  value: number;
  color?: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(215 80% 55%)",
  "hsl(142 70% 45%)",
  "hsl(30 90% 55%)",
  "hsl(0 75% 55%)",
];

export function DistributionPieChart({ data }: { data: PieSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, idx) => (
            <Cell key={entry.name} fill={entry.color || COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
          }}
        />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
}
