"use client";

import { motion } from "framer-motion";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type NativeDivProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "title" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
>;

export interface CardProps extends NativeDivProps {
  title?: ReactNode;
}

export function Card({ className, title, children, ...props }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("rounded-md border border-border bg-bg-surface p-6 shadow-elevated", className)}
      {...props}
    >
      {title ? (
        <h2 className="mb-4 font-display text-lg font-semibold text-text-primary">{title}</h2>
      ) : null}
      {children}
    </motion.div>
  );
}
