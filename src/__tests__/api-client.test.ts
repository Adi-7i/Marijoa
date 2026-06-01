import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient, setUnauthorizedHandler } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { API_BASE_URL } from "@/lib/api/config";
import {
  clearTokens,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth/token-store";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  clearTokens();
  setUnauthorizedHandler(null);
});

describe("apiClient", () => {
  it("builds URLs by appending paths to NEXT_PUBLIC_API_BASE_URL", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiClient.get("/auth/me");
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${API_BASE_URL}/auth/me`);
  });

  it("attaches Authorization: Bearer <token> when access token is present", async () => {
    setAccessToken("test-token");
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiClient.get("/auth/me");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer test-token"
    );
  });

  it("omits Authorization when authRequired is false", async () => {
    setAccessToken("test-token");
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiClient.post("/auth/login", {
      json: { email: "a@b.co", password: "x" },
      authRequired: false,
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });

  it("serializes the `json` option as application/json", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiClient.post("/chats", { json: { workspace_id: "ws-1" } });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
    expect(init.body).toBe(JSON.stringify({ workspace_id: "ws-1" }));
  });

  it("encodes query params and skips null/undefined/empty values", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiClient.get("/chats", {
      query: { workspace_id: "ws-1", status: undefined, search: "", limit: 50 },
    });
    const [url] = fetchMock.mock.calls[0];
    const u = new URL(String(url));
    expect(u.searchParams.get("workspace_id")).toBe("ws-1");
    expect(u.searchParams.get("status")).toBeNull();
    expect(u.searchParams.get("search")).toBeNull();
    expect(u.searchParams.get("limit")).toBe("50");
  });

  it("does not force JSON content type for FormData uploads", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const form = new FormData();
    form.append("workspace_id", "ws-1");
    await apiClient.post("/files/upload", { body: form });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    expect(init.body).toBe(form);
  });

  it("maps backend error envelope { error: { code, message } } to ApiError", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: { code: "AUTH_INVALID_CREDENTIALS", message: "Bad creds" } },
        { status: 401 }
      )
    );
    await expect(apiClient.post("/auth/login", { json: {}, authRequired: false }))
      .rejects.toMatchObject({
        status: 401,
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Bad creds",
      });
  });

  it("clears tokens on 401 and fires unauthorized handler", async () => {
    setAccessToken("dead-token");
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { code: "UNAUTHORIZED", message: "no" } }, { status: 401 })
    );
    await expect(apiClient.get("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(getAccessToken()).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not clear tokens on 401 when silent401 is true", async () => {
    setAccessToken("kept-token");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { code: "UNAUTHORIZED", message: "no" } }, { status: 401 })
    );
    await expect(apiClient.get("/auth/me", { silent401: true })).rejects.toBeInstanceOf(ApiError);
    expect(getAccessToken()).toBe("kept-token");
  });

  it("converts network errors into ApiError with NETWORK_ERROR", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(apiClient.get("/auth/me")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      isNetworkError: true,
      status: 0,
    });
  });

  it("does not include a body for GET requests", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiClient.get("/auth/me");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });
});
