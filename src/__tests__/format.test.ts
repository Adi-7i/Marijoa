import { describe, it, expect } from "vitest";
import { formatBytes, truncate } from "@/lib/format";

describe("formatBytes", () => {
  it("formats bytes under 1KB", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats KB", () => {
    expect(formatBytes(2048)).toBe("2 KB");
  });

  it("formats MB", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("formats GB", () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe("2.00 GB");
  });

  it("handles zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});

describe("truncate", () => {
  it("truncates long text with ellipsis", () => {
    const result = truncate("a".repeat(50), 10);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(11);
  });

  it("strips markdown formatting", () => {
    expect(truncate("**hello** world", 30)).toBe("hello world");
  });

  it("returns short text unchanged", () => {
    expect(truncate("short", 30)).toBe("short");
  });
});
