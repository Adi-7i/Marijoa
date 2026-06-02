/** TypeScript types for the Marijoa chat application */

import type { CitationSource, WebMode } from "@/types/marijoa";

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

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  thoughts?: string;
  isStreaming?: boolean;
  sources?: CitationSource[];
  webSearchUsed?: boolean;
  webMode?: WebMode;
  searchStatus?: "searching" | "complete" | null;
}
