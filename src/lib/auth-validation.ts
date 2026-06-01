import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Please enter your full name.";
  if (trimmed.length < 2) return "Name must be at least 2 characters.";
  return null;
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Email is required.";
  if (!isValidEmail(trimmed)) return "Please enter a valid email address.";
  return null;
}

export function validatePassword(value: string, minLength = 8): string | null {
  if (value.length === 0) return "Password is required.";
  if (value.length < minLength) return `Password must be at least ${minLength} characters.`;
  return null;
}

export function validatePasswordsMatch(
  password: string,
  confirm: string
): string | null {
  if (confirm.length === 0) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

export function getPasswordChecks(
  value: string,
  minLength = 8
): PasswordChecks {
  return {
    length: value.length >= minLength,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  };
}

export function getPasswordStrength(value: string): {
  score: 0 | 1 | 2 | 3 | 4 | 5;
  label: "Empty" | "Weak" | "Fair" | "Good" | "Strong";
} {
  if (value.length === 0) return { score: 0, label: "Empty" };
  const checks = getPasswordChecks(value);
  const score = (Object.values(checks).filter(Boolean).length) as 0 | 1 | 2 | 3 | 4 | 5;
  let label: "Weak" | "Fair" | "Good" | "Strong" = "Weak";
  if (score >= 5) label = "Strong";
  else if (score >= 4) label = "Good";
  else if (score >= 3) label = "Fair";
  return { score, label };
}

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
