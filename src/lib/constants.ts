/** Application-wide constants — single source of truth */

export const APP_NAME = "Marijoa" as const;

// "Indus" removed: sidebar brand is now also "Marijoa"
export const SIDEBAR_BRAND = "Marijoa" as const;

export const USER_NAME = "Kakasi Hatake" as const;
export const USER_INITIALS = "KH" as const;
export const USER_GREETING = "Hello Kakasi!" as const;

export const COMPOSER_PLACEHOLDER = "Ask me anything..." as const;
export const COMPOSER_MAX_LENGTH = 4000 as const;

export const CHAT_HISTORY: Array<{ id: string; title: string }> = [
  { id: "1", title: "Current Affairs Today" },
  { id: "2", title: "Universe Observer Qu..." },
  { id: "3", title: "Graph Cycles Analysis ..." },
  { id: "4", title: "Hello Greeting" },
];

/**
 * Demo assistant response.
 * TODO: Replace with real API call when backend is ready.
 */
export const DEMO_ASSISTANT_RESPONSE =
  "Hello! How can I help you today? I'm here to assist with any questions or topics you'd like to discuss." as const;

export const DISCLAIMER_TEXT =
  "AI generated responses can have errors, human oversight is needed." as const;
