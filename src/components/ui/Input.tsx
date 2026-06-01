"use client";

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import styles from "./input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  helperText?: string;
  rightSlot?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    rightSlot,
    fullWidth = true,
    id,
    className,
    required,
    ...rest
  },
  ref
) {
  const reactId = useId();
  const inputId = id ?? `input-${reactId}`;
  const describedById = error
    ? `${inputId}-error`
    : helperText
    ? `${inputId}-helper`
    : undefined;

  return (
    <div
      className={[
        styles.field,
        fullWidth ? styles.fieldFull : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <label htmlFor={inputId} className={styles.label}>
        {label}
        {required && (
          <span aria-hidden="true" className={styles.required}>
            {" "}
            *
          </span>
        )}
      </label>
      <div
        className={[styles.wrapper, error ? styles.wrapperError : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          ref={ref}
          id={inputId}
          className={styles.input}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedById}
          aria-required={required || undefined}
          {...rest}
        />
        {rightSlot && <div className={styles.rightSlot}>{rightSlot}</div>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className={styles.errorText}>
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className={styles.helperText}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
