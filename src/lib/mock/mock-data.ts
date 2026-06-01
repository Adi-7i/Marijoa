/**
 * Mock data for Marijoa frontend development.
 * All AI calls must go through the backend AI Gateway — never call LLMs directly from the frontend.
 */

import type { User, Organization, Workspace, Chat, Message, Artifact, FileItem } from "@/types/marijoa";
import type { ChatMessage } from "@/types/chat";

// ─── Current User ────────────────────────────────────────────────────────────

export const MOCK_USER: User = {
  id: "user-1",
  name: "Kakasi Hatake",
  email: "kakasi@example.com",
  initials: "KH",
};

// ─── Organizations ────────────────────────────────────────────────────────────

export const MOCK_PERSONAL_ORG: Organization = {
  id: "org-personal",
  name: "Personal",
  slug: "personal",
  type: "PERSONAL",
  role: "OWNER",
};

export const MOCK_COMPANY_ORG: Organization = {
  id: "org-acme",
  name: "Acme Corp",
  slug: "acme",
  type: "COMPANY",
  role: "ADMIN",
};

export const MOCK_ORGANIZATIONS: Organization[] = [MOCK_PERSONAL_ORG, MOCK_COMPANY_ORG];

// ─── Workspaces ───────────────────────────────────────────────────────────────

const BASE_TS = 1748736000000; // 2025-06-01T00:00:00Z

export const MOCK_WORKSPACES: Workspace[] = [
  {
    id: "ws-personal-default",
    organizationId: "org-personal",
    name: "My Workspace",
    isDefault: true,
    createdAt: BASE_TS - 90 * 24 * 60 * 60 * 1000,
  },
  {
    id: "ws-acme-general",
    organizationId: "org-acme",
    name: "General",
    description: "General team workspace",
    isDefault: true,
    createdAt: BASE_TS - 60 * 24 * 60 * 60 * 1000,
  },
  {
    id: "ws-acme-engineering",
    organizationId: "org-acme",
    name: "Engineering",
    description: "Engineering team workspace",
    isDefault: false,
    createdAt: BASE_TS - 45 * 24 * 60 * 60 * 1000,
  },
  {
    id: "ws-acme-marketing",
    organizationId: "org-acme",
    name: "Marketing",
    description: "Marketing team workspace",
    isDefault: false,
    createdAt: BASE_TS - 30 * 24 * 60 * 60 * 1000,
  },
];

// ─── Chats ────────────────────────────────────────────────────────────────────

export const MOCK_CHATS: Chat[] = [
  {
    id: "chat-1",
    workspaceId: "ws-personal-default",
    organizationId: "org-personal",
    title: "Current Affairs Today",
    updatedAt: BASE_TS - 2 * 60 * 60 * 1000,
    messageCount: 2,
  },
  {
    id: "chat-2",
    workspaceId: "ws-personal-default",
    organizationId: "org-personal",
    title: "Universe Observer Questions",
    updatedAt: BASE_TS - 26 * 60 * 60 * 1000,
    messageCount: 0,
  },
  {
    id: "chat-3",
    workspaceId: "ws-acme-general",
    organizationId: "org-acme",
    title: "Q2 Strategy Planning",
    updatedAt: BASE_TS - 3 * 60 * 60 * 1000,
    messageCount: 2,
  },
  {
    id: "chat-4",
    workspaceId: "ws-acme-general",
    organizationId: "org-acme",
    title: "Customer Support Playbook",
    updatedAt: BASE_TS - 24 * 60 * 60 * 1000,
    messageCount: 0,
  },
  {
    id: "chat-5",
    workspaceId: "ws-acme-engineering",
    organizationId: "org-acme",
    title: "API Architecture Review",
    updatedAt: BASE_TS - 2 * 24 * 60 * 60 * 1000,
    messageCount: 0,
  },
  {
    id: "chat-6",
    workspaceId: "ws-acme-engineering",
    organizationId: "org-acme",
    title: "Graph Cycles Analysis",
    updatedAt: BASE_TS - 3 * 24 * 60 * 60 * 1000,
    messageCount: 0,
  },
];

// ─── Messages ─────────────────────────────────────────────────────────────────

export const MOCK_MESSAGES: Message[] = [
  {
    id: "msg-1",
    chatId: "chat-1",
    role: "user",
    content: "What are the top current affairs I should know about?",
    timestamp: BASE_TS - 2 * 60 * 60 * 1000,
  },
  {
    id: "msg-2",
    chatId: "chat-1",
    role: "assistant",
    content:
      "Here are some key current affairs to be aware of. This is a **demo response** — backend integration will connect the real AI gateway once the API layer is wired up.",
    timestamp: BASE_TS - 2 * 60 * 60 * 1000 + 3000,
  },
  {
    id: "msg-3",
    chatId: "chat-3",
    role: "user",
    content: "Help me draft the Q2 strategy document for the team.",
    timestamp: BASE_TS - 3 * 60 * 60 * 1000,
  },
  {
    id: "msg-4",
    chatId: "chat-3",
    role: "assistant",
    content:
      "I'll help you draft a comprehensive Q2 strategy. This is a **demo response** — backend integration will connect the real AI gateway once the API layer is wired up.",
    timestamp: BASE_TS - 3 * 60 * 60 * 1000 + 2000,
  },
];

// ─── Artifacts ────────────────────────────────────────────────────────────────

export const MOCK_ARTIFACTS: Artifact[] = [
  {
    id: "artifact-1",
    workspaceId: "ws-acme-engineering",
    chatId: "chat-5",
    type: "code",
    title: "API Route Handler",
    language: "typescript",
    content: "// Generated API handler\nexport async function GET(req: Request) { ... }",
    createdAt: BASE_TS - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: "artifact-2",
    workspaceId: "ws-acme-general",
    chatId: "chat-3",
    type: "document",
    title: "Q2 Strategy Draft",
    content: "# Q2 Strategy\n\n## Objectives\n...",
    createdAt: BASE_TS - 3 * 60 * 60 * 1000,
  },
  {
    id: "artifact-3",
    workspaceId: "ws-personal-default",
    type: "document",
    title: "Research Notes",
    content: "# Research Notes\n\n...",
    createdAt: BASE_TS - 26 * 60 * 60 * 1000,
  },
];

// ─── Files ────────────────────────────────────────────────────────────────────

export const MOCK_FILES: FileItem[] = [
  {
    id: "file-1",
    workspaceId: "ws-acme-general",
    name: "company-overview.pdf",
    type: "application/pdf",
    sizeBytes: 245 * 1024,
    url: "#",
    uploadedAt: BASE_TS - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: "file-2",
    workspaceId: "ws-acme-engineering",
    name: "api-spec.yaml",
    type: "text/yaml",
    sizeBytes: 12 * 1024,
    url: "#",
    uploadedAt: BASE_TS - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: "file-3",
    workspaceId: "ws-personal-default",
    name: "notes.md",
    type: "text/markdown",
    sizeBytes: 3 * 1024,
    url: "#",
    uploadedAt: BASE_TS - 26 * 60 * 60 * 1000,
  },
];

// ─── Adapter ──────────────────────────────────────────────────────────────────

/** Converts a domain Message to the UI ChatMessage shape for rendering. */
export function adaptMessageToChat(msg: Message): ChatMessage {
  return {
    id: msg.id,
    role: msg.role === "user" ? "user" : "assistant",
    content: msg.content,
    timestamp: msg.timestamp,
    isStreaming: msg.isStreaming,
  };
}
