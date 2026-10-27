"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, useReducedMotion } from "framer-motion";
import type { DashboardActivity, DashboardCurrent } from "@/types/adminDashboard";
import styles from "./dashboard.module.css";

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("es-EC", { month: "short", timeZone: "UTC" }).format(
    new Date(`${month}-01T12:00:00Z`),
  );
export function EvolutionChart({
  series,
  metric,
}: {
  series: DashboardActivity["series"];
  metric: "enrollments" | "practices";
}) {
  const reduced = useReducedMotion();
  const label = metric === "enrollments" ? "Matrículas" : "Prácticas realizadas";
  return (
    <motion.div
      key={metric}
      initial={false}
      animate={reduced ? undefined : { opacity: [0.65, 1] }}
      transition={{ duration: 0.2 }}
      className={styles.chart}
      role="img"
      aria-label={`${label} en los últimos seis meses. Datos exactos disponibles en la tabla inferior.`}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 320, height: 210 }}
      >
        <BarChart data={series} margin={{ top: 10, right: 4, bottom: 0, left: -24 }} title={label}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 5" />
          <XAxis
            dataKey="month"
            tickFormatter={monthLabel}
            axisLine={false}
            tickLine={false}
            tickMargin={12}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-brand-tint)" }}
            labelFormatter={(value) =>
              new Intl.DateTimeFormat("es-EC", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${value}-01T12:00:00Z`))
            }
            contentStyle={{
              background: "var(--color-bg-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text-primary)",
            }}
          />
          <Bar
            dataKey={metric}
            name={label}
            fill="var(--color-brand-primary)"
            radius={[5, 5, 0, 0]}
            maxBarSize={44}
            isAnimationActive={false}
          >
            {series.map((item, i) => (
              <Cell
                key={item.month}
                fill={
                  i === series.length - 1
                    ? "var(--color-brand-primary)"
                    : "var(--dashboard-bar-muted)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function DistributionChart({
  distribution,
}: {
  distribution: DashboardCurrent["distribution"];
}) {
  const total = distribution.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className={styles.donut} aria-hidden="true">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 162, height: 162 }}
      >
        <PieChart accessibilityLayer={false}>
          <Pie
            data={distribution}
            dataKey="value"
            nameKey="label"
            innerRadius="72%"
            outerRadius="94%"
            paddingAngle={total ? 3 : 0}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {distribution.map((item, i) => (
              <Cell
                key={item.key}
                fill={
                  [
                    "var(--color-brand-primary)",
                    "var(--dashboard-course-a)",
                    "var(--dashboard-course-both)",
                  ][i]
                }
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--color-bg-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className={styles.donutCenter}>
        <strong>{total.toLocaleString("es-EC")}</strong>
        <span>alumnos</span>
      </div>
    </div>
  );
}
