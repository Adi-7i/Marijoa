/**
 * Mock data for Marijoa frontend development.
 * All AI calls must go through the backend AI Gateway — never call LLMs directly from the frontend.
 */

import type {
  User,
  Organization,
  OrganizationMember,
  Workspace,
  Chat,
  Message,
  Artifact,
  FileItem,
} from "@/types/marijoa";
import type { ChatMessage } from "@/types/chat";

// Fixed timestamp to avoid server/client hydration mismatches
const BASE_TS = 1748736000000; // 2025-06-01T00:00:00Z

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
  memberCount: 1,
};

export const MOCK_COMPANY_ORG: Organization = {
  id: "org-cynerza",
  name: "Cynerza Systems Pvt Ltd",
  slug: "cynerza",
  type: "COMPANY",
  role: "OWNER",
  memberCount: 5,
};

export const MOCK_ORGANIZATIONS: Organization[] = [MOCK_PERSONAL_ORG, MOCK_COMPANY_ORG];

// ─── Members ──────────────────────────────────────────────────────────────────

export const MOCK_MEMBERS: OrganizationMember[] = [
  {
    id: "member-1",
    organizationId: "org-cynerza",
    userId: "user-1",
    fullName: "Kakasi Hatake",
    email: "kakasi@cynerza.com",
    initials: "KH",
    role: "OWNER",
    status: "ACTIVE",
  },
  {
    id: "member-2",
    organizationId: "org-cynerza",
    userId: "user-2",
    fullName: "Sakura Haruno",
    email: "sakura@cynerza.com",
    initials: "SH",
    role: "ADMIN",
    status: "ACTIVE",
  },
  {
    id: "member-3",
    organizationId: "org-cynerza",
    userId: "user-3",
    fullName: "Naruto Uzumaki",
    email: "naruto@cynerza.com",
    initials: "NU",
    role: "MANAGER",
    status: "ACTIVE",
  },
  {
    id: "member-4",
    organizationId: "org-cynerza",
    userId: "user-4",
    fullName: "Hinata Hyuga",
    email: "hinata@cynerza.com",
    initials: "HH",
    role: "MEMBER",
    status: "ACTIVE",
  },
  {
    id: "member-5",
    organizationId: "org-cynerza",
    userId: "user-5",
    fullName: "Shino Aburame",
    email: "shino@cynerza.com",
    initials: "SA",
    role: "VIEWER",
    status: "INVITED",
  },
];

// ─── Workspaces ───────────────────────────────────────────────────────────────

export const MOCK_WORKSPACES: Workspace[] = [
  // Personal
  {
    id: "ws-personal-default",
    organizationId: "org-personal",
    name: "My Workspace",
    isDefault: true,
    userRole: "OWNER",
    chatCount: 2,
    fileCount: 1,
    artifactCount: 1,
    createdAt: BASE_TS - 90 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 2 * 60 * 60 * 1000,
  },
  // Cynerza workspaces
  {
    id: "ws-cynerza-sales",
    organizationId: "org-cynerza",
    name: "Sales Team",
    description: "Sales pipeline, pitches, and client communication",
    isDefault: true,
    userRole: "OWNER",
    chatCount: 4,
    fileCount: 2,
    artifactCount: 1,
    createdAt: BASE_TS - 50 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 2 * 60 * 60 * 1000,
  },
  {
    id: "ws-cynerza-tech",
    organizationId: "org-cynerza",
    name: "Tech Team",
    description: "Engineering, architecture, and development discussions",
    isDefault: false,
    userRole: "OWNER",
    chatCount: 3,
    fileCount: 3,
    artifactCount: 2,
    createdAt: BASE_TS - 45 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: "ws-cynerza-hr",
    organizationId: "org-cynerza",
    name: "HR Team",
    description: "Recruitment, offer letters, and HR processes",
    isDefault: false,
    userRole: "OWNER",
    chatCount: 2,
    fileCount: 1,
    artifactCount: 0,
    createdAt: BASE_TS - 40 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: "ws-cynerza-client-tc",
    organizationId: "org-cynerza",
    name: "Client - Tech Corner",
    description: "Project workspace for Tech Corner client",
    isDefault: false,
    userRole: "OWNER",
    chatCount: 2,
    fileCount: 2,
    artifactCount: 1,
    createdAt: BASE_TS - 30 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: "ws-cynerza-client-gym",
    organizationId: "org-cynerza",
    name: "Client - Popular Gym",
    description: "Project workspace for Popular Gym client",
    isDefault: false,
    userRole: "OWNER",
    chatCount: 1,
    fileCount: 0,
    artifactCount: 0,
    createdAt: BASE_TS - 20 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 7 * 24 * 60 * 60 * 1000,
  },
];

// ─── Chats ────────────────────────────────────────────────────────────────────

export const MOCK_CHATS: Chat[] = [
  // Personal chats
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
  // Sales Team chats
  {
    id: "chat-3",
    workspaceId: "ws-cynerza-sales",
    organizationId: "org-cynerza",
    title: "Q2 Strategy Planning",
    updatedAt: BASE_TS - 3 * 60 * 60 * 1000,
    messageCount: 2,
  },
  {
    id: "chat-4",
    workspaceId: "ws-cynerza-sales",
    organizationId: "org-cynerza",
    title: "Customer Support Playbook",
    updatedAt: BASE_TS - 24 * 60 * 60 * 1000,
    messageCount: 0,
  },
  {
    id: "chat-5",
    workspaceId: "ws-cynerza-sales",
    organizationId: "org-cynerza",
    title: "Sales Pitch Ideas",
    updatedAt: BASE_TS - 4 * 60 * 60 * 1000,
    messageCount: 0,
  },
  // Tech Team chats
  {
    id: "chat-6",
    workspaceId: "ws-cynerza-tech",
    organizationId: "org-cynerza",
    title: "Backend Architecture Review",
    updatedAt: BASE_TS - 1 * 24 * 60 * 60 * 1000,
    messageCount: 0,
  },
  {
    id: "chat-7",
    workspaceId: "ws-cynerza-tech",
    organizationId: "org-cynerza",
    title: "API Architecture Review",
    updatedAt: BASE_TS - 3 * 24 * 60 * 60 * 1000,
    messageCount: 0,
  },
  // HR Team chats
  {
    id: "chat-8",
    workspaceId: "ws-cynerza-hr",
    organizationId: "org-cynerza",
    title: "HR Offer Letter Draft",
    updatedAt: BASE_TS - 3 * 24 * 60 * 60 * 1000,
    messageCount: 0,
  },
  {
    id: "chat-9",
    workspaceId: "ws-cynerza-hr",
    organizationId: "org-cynerza",
    title: "Onboarding Checklist",
    updatedAt: BASE_TS - 4 * 24 * 60 * 60 * 1000,
    messageCount: 0,
  },
  // Client - Tech Corner chats
  {
    id: "chat-10",
    workspaceId: "ws-cynerza-client-tc",
    organizationId: "org-cynerza",
    title: "Tech Corner Proposal",
    updatedAt: BASE_TS - 2 * 24 * 60 * 60 * 1000,
    messageCount: 0,
  },
  {
    id: "chat-11",
    workspaceId: "ws-cynerza-client-tc",
    organizationId: "org-cynerza",
    title: "Project Kickoff Notes",
    updatedAt: BASE_TS - 5 * 24 * 60 * 60 * 1000,
    messageCount: 0,
  },
  // Client - Popular Gym chats
  {
    id: "chat-12",
    workspaceId: "ws-cynerza-client-gym",
    organizationId: "org-cynerza",
    title: "Gym App Feature Brainstorm",
    updatedAt: BASE_TS - 6 * 24 * 60 * 60 * 1000,
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
    workspaceId: "ws-cynerza-tech",
    chatId: "chat-7",
    type: "code",
    title: "API Route Handler",
    language: "typescript",
    content: "// Generated API handler\nexport async function GET(req: Request) { ... }",
    createdAt: BASE_TS - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: "artifact-2",
    workspaceId: "ws-cynerza-sales",
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
    workspaceId: "ws-cynerza-sales",
    name: "company-overview.pdf",
    type: "application/pdf",
    sizeBytes: 245 * 1024,
    url: "#",
    uploadedAt: BASE_TS - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: "file-2",
    workspaceId: "ws-cynerza-tech",
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
