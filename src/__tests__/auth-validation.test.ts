import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  validateName,
  validateEmail,
  validatePassword,
  validatePasswordsMatch,
  getPasswordChecks,
  getPasswordStrength,
  loginSchema,
  signupSchema,
} from "@/lib/auth-validation";

describe("isValidEmail", () => {
  it("accepts standard emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("first.last+tag@sub.example.co")).toBe(true);
  });

  it("rejects malformed emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("user")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user@example")).toBe(false);
    expect(isValidEmail("user @ example.com")).toBe(false);
  });
});

describe("validateName", () => {
  it("requires non-empty input", () => {
    expect(validateName("")).toMatch(/enter your full name/i);
    expect(validateName("   ")).toMatch(/enter your full name/i);
  });

  it("requires at least 2 characters", () => {
    expect(validateName("A")).toMatch(/at least 2/i);
  });

  it("returns null for valid names", () => {
    expect(validateName("Naruto Uzumaki")).toBeNull();
  });
});

describe("validateEmail", () => {
  it("requires email", () => {
    expect(validateEmail("")).toMatch(/required/i);
  });

  it("requires valid format", () => {
    expect(validateEmail("not-an-email")).toMatch(/valid email/i);
  });

  it("returns null for valid email", () => {
    expect(validateEmail("a@b.co")).toBeNull();
  });
});

describe("validatePassword", () => {
  it("requires password", () => {
    expect(validatePassword("")).toMatch(/required/i);
  });

  it("enforces minimum length", () => {
    expect(validatePassword("short")).toMatch(/at least 8/i);
  });

  it("accepts long-enough password", () => {
    expect(validatePassword("longenough1")).toBeNull();
  });
});

describe("validatePasswordsMatch", () => {
  it("requires confirmation", () => {
    expect(validatePasswordsMatch("abc12345", "")).toMatch(/confirm/i);
  });

  it("flags mismatch", () => {
    expect(validatePasswordsMatch("abc12345", "abc12346")).toMatch(/do not match/i);
  });

  it("returns null when they match", () => {
    expect(validatePasswordsMatch("abc12345", "abc12345")).toBeNull();
  });
});

describe("getPasswordChecks", () => {
  it("scores all categories independently", () => {
    expect(getPasswordChecks("aB3!aaaa")).toEqual({
      length: true,
      uppercase: true,
      lowercase: true,
      number: true,
      special: true,
    });
  });

  it("flags only lowercase when only lowercase is present", () => {
    const c = getPasswordChecks("abc");
    expect(c.lowercase).toBe(true);
    expect(c.uppercase).toBe(false);
    expect(c.number).toBe(false);
    expect(c.special).toBe(false);
    expect(c.length).toBe(false);
  });
});

describe("getPasswordStrength", () => {
  it("returns Empty for empty input", () => {
    expect(getPasswordStrength("")).toEqual({ score: 0, label: "Empty" });
  });

  it("returns Weak for low score", () => {
    expect(getPasswordStrength("abc").label).toBe("Weak");
  });

  it("returns Strong for full coverage", () => {
    expect(getPasswordStrength("Abcdef1!").label).toBe("Strong");
  });
});

describe("loginSchema", () => {
  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "a@b.co", password: "" });
    expect(result.success).toBe(false);
  });

  it("accepts valid input", () => {
    const result = loginSchema.safeParse({ email: "a@b.co", password: "anything" });
    expect(result.success).toBe(true);
  });
});

describe("signupSchema", () => {
  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({
      fullName: "Naruto",
      email: "n@k.co",
      password: "abcd1234",
      confirmPassword: "abcd9999",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid signup", () => {
    const result = signupSchema.safeParse({
      fullName: "Naruto Uzumaki",
      email: "n@k.co",
      password: "abcd1234",
      confirmPassword: "abcd1234",
    });
    expect(result.success).toBe(true);
  });
});
