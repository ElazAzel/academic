"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface VisitBar {
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
}

const DEFAULT_COLOR = "hsl(var(--primary))";

export function VisitBarChart({
  data,
  barKey = "value",
}: {
  data: VisitBar[];
  barKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
          }}
          formatter={(value, _name, { payload }: any) => [
            payload?.sublabel ? `${value} (${payload.sublabel})` : value,
            "Значение",
          ]}
        />
        <Bar dataKey={barKey} radius={[4, 4, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={`cell-${idx}`} fill={entry.color || DEFAULT_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
