"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CohortProgress } from "@/types/content";
export default function ProgressChart({ ranges }: { ranges: CohortProgress["rangos"] }) {
  const data = (["0-25", "26-50", "51-75", "76-99", "100"] as const).map((range) => ({
    range,
    count: ranges[range],
  }));
  return (
    <div
      className="h-64 min-w-0"
      role="img"
      aria-label="Alumnos por rango de progreso. Cifras exactas en la lista inferior."
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 300, height: 256 }}
      >
        <BarChart data={data} margin={{ left: -20, right: 10, top: 10 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="range" tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
          />
          <Tooltip
            labelFormatter={(value) => `${value}%`}
            contentStyle={{
              background: "var(--color-bg-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <Bar
            dataKey="count"
            name="Alumnos"
            fill="var(--color-accent-red)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
