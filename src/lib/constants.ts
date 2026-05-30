/** Application-wide constants - single source of truth */

export const APP_NAME = "Marijoa" as const;
export const SIDEBAR_BRAND = "Marijoa" as const;

export const USER_NAME = "Kakasi Hatake" as const;
export const USER_INITIALS = "KH" as const;
export const USER_GREETING = "Hello Kakasi!" as const;

export const COMPOSER_PLACEHOLDER = "Ask me anything..." as const;
export const COMPOSER_MAX_LENGTH = 4000 as const;

const now = Date.now();

export const CHAT_HISTORY: Array<{ id: string; title: string; updatedAt: number }> = [
  { id: "1", title: "Current Affairs Today", updatedAt: now - 2 * 60 * 60 * 1000 },
  { id: "2", title: "Universe Observer Qu...", updatedAt: now - 26 * 60 * 60 * 1000 },
  { id: "3", title: "Graph Cycles Analysis ...", updatedAt: now - 3 * 24 * 60 * 60 * 1000 },
  { id: "4", title: "Hello Greeting", updatedAt: now - 6 * 24 * 60 * 60 * 1000 },
];

export const DEMO_ASSISTANT_RESPONSE =
  "Hello! How can I help you today? I'm here to assist with any questions or topics you'd like to discuss." as const;

export const DISCLAIMER_TEXT =
  "AI generated responses can have errors, human oversight is needed." as const;
