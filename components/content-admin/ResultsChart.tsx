"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export default function ResultsChart({ data }: { data: { range: string; count: number }[] }) {
  return (
    <div
      className="h-52 min-w-0"
      role="img"
      aria-label="Distribución de notas de intentos completados. Cifras en la lista inferior."
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 300, height: 208 }}
      >
        <BarChart data={data} margin={{ left: -20, right: 12, top: 10 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="range" tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
          />
          <Tooltip
            labelFormatter={(label) => `${label}%`}
            contentStyle={{
              background: "var(--color-bg-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <Bar
            dataKey="count"
            name="Intentos"
            fill="var(--color-brand-primary)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
