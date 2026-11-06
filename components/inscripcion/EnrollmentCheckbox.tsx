"use client";
import { forwardRef, type InputHTMLAttributes } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import styles from "./enrollment-checkbox.module.css";

export const EnrollmentCheckbox = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function EnrollmentCheckbox({ className, ...props }, ref) {
  return (
    <span className={styles.control}>
      <input {...props} type="checkbox" ref={ref} className={cn(styles.checkbox, className)} />
      <CheckIcon className={styles.tick} />
    </span>
  );
});
