"use client";

import { getPasswordChecks, getPasswordStrength } from "@/lib/auth-validation";
import styles from "./auth.module.css";

interface PasswordStrengthHintProps {
  value: string;
  minLength?: number;
}

const BAR_VARIANT: Record<number, string> = {
  1: styles.strengthBarWeak,
  2: styles.strengthBarWeak,
  3: styles.strengthBarFair,
  4: styles.strengthBarGood,
  5: styles.strengthBarStrong,
};

export function PasswordStrengthHint({
  value,
  minLength = 8,
}: PasswordStrengthHintProps) {
  const checks = getPasswordChecks(value, minLength);
  const { score, label } = getPasswordStrength(value);
  const filledVariant = BAR_VARIANT[score] ?? "";

  return (
    <div className={styles.strength} aria-live="polite">
      <div className={styles.strengthBars} aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={[
              styles.strengthBar,
              i < score ? styles.strengthBarFilled : "",
              i < score ? filledVariant : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ))}
      </div>
      <div className={styles.strengthHeader}>
        <span>Password strength</span>
        <span className={styles.strengthLabel}>{value.length === 0 ? "—" : label}</span>
      </div>
      <ul className={styles.strengthChecks} aria-label="Strength requirements">
        <Check on={checks.length} label={`At least ${minLength} characters`} />
        <Check on={checks.uppercase} label="Uppercase letter" />
        <Check on={checks.lowercase} label="Lowercase letter" />
        <Check on={checks.number} label="Number" />
        <Check on={checks.special} label="Special character" />
      </ul>
    </div>
  );
}

function Check({ on, label }: { on: boolean; label: string }) {
  return (
    <li
      className={[styles.strengthCheck, on ? styles.strengthCheckOn : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={styles.strengthCheckDot} aria-hidden="true" />
      <span>{label}</span>
    </li>
  );
}
