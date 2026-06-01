"use client";

/**
 * Mock-only auth helper. NOT real auth. NO tokens, NO secrets.
 * Stores a single flag + optional display name in localStorage so the demo can
 * show a "signed in as" experience. Will be replaced entirely during the
 * backend integration phase with real /api/v1/auth calls.
 */

const FLAG_KEY = "marijoa_mock_auth";
const NAME_KEY = "marijoa_mock_user_name";
const EMAIL_KEY = "marijoa_mock_user_email";

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface MockAuthUser {
  name: string;
  email: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mockLogin(
  email: string,
  password: string
): Promise<MockAuthUser> {
  await delay(450);
  if (!email.trim() || !password) {
    throw new Error("Email and password are required.");
  }
  const storage = safeStorage();
  const trimmedEmail = email.trim().toLowerCase();
  const displayName =
    storage?.getItem(NAME_KEY) ?? deriveNameFromEmail(trimmedEmail);
  storage?.setItem(FLAG_KEY, "true");
  storage?.setItem(EMAIL_KEY, trimmedEmail);
  storage?.setItem(NAME_KEY, displayName);
  return { name: displayName, email: trimmedEmail };
}

export async function mockSignup(
  fullName: string,
  email: string,
  password: string
): Promise<MockAuthUser> {
  await delay(550);
  if (!fullName.trim() || !email.trim() || !password) {
    throw new Error("All fields are required.");
  }
  const storage = safeStorage();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = fullName.trim();
  storage?.setItem(FLAG_KEY, "true");
  storage?.setItem(EMAIL_KEY, trimmedEmail);
  storage?.setItem(NAME_KEY, trimmedName);
  return { name: trimmedName, email: trimmedEmail };
}

export function mockLogout(): void {
  const storage = safeStorage();
  storage?.removeItem(FLAG_KEY);
  storage?.removeItem(EMAIL_KEY);
  storage?.removeItem(NAME_KEY);
}

export function isMockAuthenticated(): boolean {
  const storage = safeStorage();
  return storage?.getItem(FLAG_KEY) === "true";
}

export function getMockUser(): MockAuthUser | null {
  const storage = safeStorage();
  if (!storage) return null;
  if (storage.getItem(FLAG_KEY) !== "true") return null;
  const email = storage.getItem(EMAIL_KEY);
  const name = storage.getItem(NAME_KEY);
  if (!email || !name) return null;
  return { email, name };
}

function deriveNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  if (!local) return "Member";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
