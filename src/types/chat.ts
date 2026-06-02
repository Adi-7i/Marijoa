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

export interface ChatMessage {
  id: string;
  role: MessageRole;
  kind?: MessageKind;
  content: string;
  timestamp: number;
  thoughts?: string;
  isStreaming?: boolean;
  sources?: CitationSource[];
  webSearchUsed?: boolean;
  webMode?: WebMode;
  searchStatus?: "searching" | "complete" | null;
  searchQueries?: string[];
  research?: DeepResearchCardState;
}
