/**
 * Barrel exports for the Marijoa API service layer.
 *
 * Components and hooks should import from `@/lib/api`. Internal modules
 * (adapters, raw types, client config) should be imported from their concrete
 * paths.
 */

export { apiClient, apiRequest, setUnauthorizedHandler } from "./client";
export { ApiError, isApiError } from "./errors";
export { API_BASE_URL } from "./config";

export * as authApi from "./auth";
export * as personalApi from "./personal";
export * as organizationsApi from "./organizations";
export * as workspacesApi from "./workspaces";
export * as chatsApi from "./chats";
export * as messagesApi from "./messages";
export * as aiApi from "./ai";
export * as artifactsApi from "./artifacts";
export * as filesApi from "./files";
export * as adminApi from "./admin";
export * as invitationsApi from "./invitations";

export type { AuthSession } from "./auth";
export type { PersonalContext } from "./personal";
export type { PaginatedResult } from "./admin";
export type {
  AIStreamHandlers,
  AIStreamOptions,
  AIStreamStartPayload,
  AIStreamDonePayload,
  AIStreamErrorPayload,
  AIRespondResult,
} from "./ai";
