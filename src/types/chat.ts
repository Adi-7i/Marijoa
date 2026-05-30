/** TypeScript types for the Marijoa chat application */

export interface ChatHistoryItem {
  id: string;
  title: string;
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
}
