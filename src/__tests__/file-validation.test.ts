import { describe, it, expect } from "vitest";
import { validateFileSize, MAX_UPLOAD_BYTES } from "@/lib/api/files";

function fakeFile(name: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type: "application/octet-stream" });
  return new File([blob], name, { type: "application/octet-stream" });
}

describe("validateFileSize", () => {
  it("accepts a small file", () => {
    const result = validateFileSize(fakeFile("hi.txt", 1024));
    expect(result.ok).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it("rejects an empty file", () => {
    const result = validateFileSize(fakeFile("empty.txt", 0));
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/empty/i);
  });

  it("rejects a file larger than the default max", () => {
    const result = validateFileSize(fakeFile("big.bin", MAX_UPLOAD_BYTES + 1));
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/too large/i);
  });

  it("respects a custom maxBytes", () => {
    const small = 1024;
    const result = validateFileSize(fakeFile("two-k.bin", 2048), small);
    expect(result.ok).toBe(false);
  });
});
