/**
 * Typed API error model used across every service module.
 *
 * The FastAPI backend returns errors in the canonical shape:
 *   { "error": { "code": "...", "message": "...", "details": ... } }
 *
 * When the response body cannot be parsed (network error, HTML response,
 * empty body) we still raise an `ApiError` so callers only ever deal with
 * one error type.
 */

export interface ApiErrorDetails {
  [key: string]: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetails | null;
  readonly isNetworkError: boolean;

  constructor(opts: {
    status: number;
    code: string;
    message: string;
    details?: ApiErrorDetails | null;
    isNetworkError?: boolean;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details ?? null;
    this.isNetworkError = opts.isNetworkError ?? false;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}
