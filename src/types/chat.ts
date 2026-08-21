/** TypeScript types for the Marijoa chat application */

import type { CitationSource, WebMode } from "@/types/marijoa";
import type { DeepResearchCardState } from "@/types/deep-research";

export interface ChatHistoryItem {
  id: string;
  title: string;
  updatedAt?: number;
}

export interface UserProfile {
  name: string;
  initials: string;
}

export type MessageRole = "user" | "assistant";
export type MessageKind = "chat" | "deep_research";

/**
 * Stream phase for assistant messages.
 * - "thinking"  → model is processing, show loading indicator only
 * - "answering" → final answer tokens are streaming in
 * - "complete"  → stream finished
 * - "error"     → stream ended with an error
 */
export type StreamPhase = "thinking" | "answering" | "complete" | "error";

/**
 * Normalized user-facing error state. Never contains raw backend details,
 * stack traces, or internal error objects.
 */
export interface MessageErrorState {
  /** Short user-facing message (never a raw SDK error). */
  message: string;
  /** Optional secondary detail (e.g. "Authentication with the AI provider failed."). */
  detail?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  kind?: MessageKind;
  /** The safe, final answer shown to the user. Never contains raw reasoning. */
  content: string;
  timestamp: number;
  /**
   * Optional concise reasoning summary — a high-level, user-facing explanation
   * of the approach taken. Must NEVER contain raw chain-of-thought, internal
   * prompts, or hidden model reasoning.
   *
   * Collapsed by default in the UI; user can expand it.
   *
   * @deprecated `thoughts` — use `reasoningSummary` for new messages.
   *   Old persisted messages may still carry `thoughts` from pre-refactor.
   */
  reasoningSummary?: string;
  isStreaming?: boolean;
  /** Current phase of the streaming pipeline for this message. */
  streamPhase?: StreamPhase;
  /**
   * Structured error state. When set, the message renderer shows a clean
   * user-facing error UI instead of `content`. Never renders raw backend errors.
   */
  errorState?: MessageErrorState;
  sources?: CitationSource[];
  webSearchUsed?: boolean;
  webMode?: WebMode;
  searchStatus?: "searching" | "complete" | null;
  searchQueries?: string[];
  research?: DeepResearchCardState;
}
