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
  WorkspaceContext,
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
  {
    id: "ws-personal-default",
    organizationId: "org-personal",
    name: "My Workspace",
    description: "Personal workspace for general tasks, research, and notes.",
    isDefault: true,
    userRole: "OWNER",
    chatCount: 2,
    fileCount: 1,
    artifactCount: 1,
    createdAt: BASE_TS - 90 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 2 * 60 * 60 * 1000,
  },
  {
    id: "ws-cynerza-sales",
    organizationId: "org-cynerza",
    name: "Sales Team",
    description: "Sales pipeline, pitches, and client communication.",
    systemInstruction: "You are a professional sales consultant for Cynerza Systems. Help craft compelling pitches, follow-up emails, and sales strategies targeting enterprise clients.",
    isDefault: true,
    userRole: "OWNER",
    chatCount: 4,
    fileCount: 3,
    artifactCount: 3,
    createdAt: BASE_TS - 50 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 2 * 60 * 60 * 1000,
  },
  {
    id: "ws-cynerza-tech",
    organizationId: "org-cynerza",
    name: "Tech Team",
    description: "Engineering, architecture, and development discussions.",
    systemInstruction: "You are a senior software architect helping Cynerza's tech team. Focus on scalable, maintainable solutions using FastAPI, PostgreSQL, and Next.js.",
    isDefault: false,
    userRole: "OWNER",
    chatCount: 3,
    fileCount: 3,
    artifactCount: 3,
    createdAt: BASE_TS - 45 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: "ws-cynerza-hr",
    organizationId: "org-cynerza",
    name: "HR Team",
    description: "Recruitment, offer letters, and HR processes.",
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
    description: "Project workspace for Tech Corner client — proposal drafting and project coordination.",
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
    description: "Project workspace for Popular Gym client — feature planning and app design.",
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
  // Tech Team — API Route Handler (code)
  {
    id: "artifact-1",
    workspaceId: "ws-cynerza-tech",
    chatId: "chat-7",
    createdBy: "user-1",
    type: "code",
    title: "API Route Handler",
    language: "typescript",
    content: `// Generated API handler\nimport { NextResponse } from "next/server";\n\nexport async function GET(req: Request) {\n  const data = await fetchData();\n  return NextResponse.json({ data });\n}\n\nexport async function POST(req: Request) {\n  const body = await req.json();\n  // validate and process\n  return NextResponse.json({ success: true });\n}`,
    version: 1,
    isActive: true,
    createdAt: BASE_TS - 3 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 3 * 24 * 60 * 60 * 1000,
  },
  // Sales Team — Q2 Strategy (document)
  {
    id: "artifact-2",
    workspaceId: "ws-cynerza-sales",
    chatId: "chat-3",
    createdBy: "user-1",
    type: "document",
    title: "Q2 Strategy Draft",
    content: `# Q2 Strategy — Cynerza Systems\n\n## Objectives\n\n1. Expand enterprise client base by 30%\n2. Launch three new AI workspace features\n3. Strengthen Tech Corner and Popular Gym partnerships\n\n## Key Initiatives\n\n**Sales Track**\n- Targeted outreach to 50 new enterprise prospects\n- Revamp pricing sheet for mid-market segment\n\n**Product Track**\n- Artifact persistence and version history\n- File-aware AI context\n- Admin audit dashboard`,
    version: 2,
    isActive: true,
    createdAt: BASE_TS - 3 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 1 * 60 * 60 * 1000,
  },
  // Personal — Research Notes (note)
  {
    id: "artifact-3",
    workspaceId: "ws-personal-default",
    createdBy: "user-1",
    type: "note",
    title: "Research Notes",
    content: `# Research Notes\n\n## Key Findings\n\n- Marijoa AI workspace adoption is highest in engineering and sales teams\n- Organizations with structured workspace instructions see 40% better AI output quality\n- File-aware context significantly improves proposal quality\n\n## Follow-up\n\n- Deep dive on artifact versioning patterns\n- Compare with Notion AI and Coda AI`,
    version: 1,
    isActive: true,
    createdAt: BASE_TS - 26 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 26 * 60 * 60 * 1000,
  },
  // Client TC — Tech Corner Proposal (proposal)
  {
    id: "artifact-4",
    workspaceId: "ws-cynerza-client-tc",
    chatId: "chat-10",
    createdBy: "user-1",
    type: "proposal",
    title: "Tech Corner Project Proposal",
    content: `# Project Proposal — Tech Corner\n\n**Prepared by:** Cynerza Systems Pvt Ltd\n**Version:** 2.0\n\n## Executive Summary\n\nCynerza proposes a 6-month AI integration project to deploy a private workspace AI platform for Tech Corner's engineering and product teams.\n\n## Scope\n\n1. Private AI workspace deployment\n2. File-aware context pipeline\n3. Team onboarding and training\n\n## Timeline\n\n| Phase | Duration |\n|---|---|\n| Discovery | 2 weeks |\n| Development | 16 weeks |\n| Testing & Launch | 6 weeks |\n\n## Investment\n\nAvailable on request.`,
    version: 2,
    isActive: true,
    createdAt: BASE_TS - 5 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 2 * 24 * 60 * 60 * 1000,
  },
  // Sales — BDE Follow-up Email (email)
  {
    id: "artifact-5",
    workspaceId: "ws-cynerza-sales",
    createdBy: "user-2",
    type: "email",
    title: "BDE Follow-up Email",
    content: `Subject: Following up on our conversation — Cynerza AI Workspace\n\nHi [Name],\n\nThank you for taking the time to speak with us last week. I wanted to follow up with a quick summary of what we discussed and the next steps.\n\nAs we mentioned, Marijoa gives your team a private AI workspace that connects directly to your files and documents — no public data, no model training on your content.\n\nI've attached our company profile and a preliminary proposal for your review.\n\nWould Tuesday or Wednesday work for a 30-minute demo call?\n\nBest regards,\nKakasi Hatake\nCynerza Systems`,
    version: 1,
    isActive: true,
    createdAt: BASE_TS - 3 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 3 * 24 * 60 * 60 * 1000,
  },
  // Sales — Sales Prompt Template (prompt)
  {
    id: "artifact-6",
    workspaceId: "ws-cynerza-sales",
    createdBy: "user-2",
    type: "prompt",
    title: "Sales Pitch Prompt Template",
    content: `You are a senior sales consultant for Cynerza Systems, a B2B AI workspace company.\n\nWhen given a prospect's company name and industry, craft a compelling 3-paragraph outreach message that:\n\n1. Acknowledges their specific industry challenges\n2. Shows how Marijoa's private AI workspace addresses those challenges\n3. Ends with a clear, low-pressure call to action\n\nTone: Professional, confident, not salesy.\nLength: 150–200 words.\n\nProspect context: {{COMPANY_NAME}}, {{INDUSTRY}}`,
    version: 1,
    isActive: true,
    createdAt: BASE_TS - 7 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 5 * 24 * 60 * 60 * 1000,
  },
  // Tech Team — Backend Architecture Notes (document)
  {
    id: "artifact-7",
    workspaceId: "ws-cynerza-tech",
    chatId: "chat-6",
    createdBy: "user-3",
    type: "document",
    title: "Backend Architecture Notes",
    content: `# Backend Architecture — Marijoa\n\n## Stack\n\n- **API**: FastAPI (Python 3.12)\n- **Database**: PostgreSQL 15 + pgvector\n- **File Storage**: Azure Blob Storage\n- **Background Jobs**: RQ + Redis\n- **Auth**: JWT + refresh tokens\n\n## Key Design Decisions\n\n### Multi-tenancy\nAll core tables have organization_id columns. Row-level filtering enforced at ORM layer.\n\n### AI Gateway\nAll LLM calls route through a single AI Gateway module. No direct OpenAI calls from product endpoints.\n\n### File Pipeline\n1. Upload → Azure Blob (via backend proxy)\n2. Background job → text extraction\n3. Embeddings → pgvector\n4. Context injection → AI Gateway`,
    version: 3,
    isActive: true,
    createdAt: BASE_TS - 10 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 1 * 24 * 60 * 60 * 1000,
  },
  // Tech Team — FastAPI Code Snippet (code)
  {
    id: "artifact-8",
    workspaceId: "ws-cynerza-tech",
    createdBy: "user-1",
    type: "code",
    title: "FastAPI Endpoint Snippet",
    language: "python",
    content: `from fastapi import APIRouter, Depends, HTTPException\nfrom sqlalchemy.orm import Session\nfrom app.db import get_db\nfrom app.auth import require_workspace_access\nfrom app.models import Artifact\n\nrouter = APIRouter(prefix="/artifacts", tags=["artifacts"])\n\n@router.get("/")\nasync def list_artifacts(\n    workspace_id: str,\n    db: Session = Depends(get_db),\n    user=Depends(require_workspace_access),\n):\n    artifacts = (\n        db.query(Artifact)\n        .filter(\n            Artifact.workspace_id == workspace_id,\n            Artifact.is_active == True,\n        )\n        .order_by(Artifact.updated_at.desc())\n        .all()\n    )\n    return artifacts`,
    version: 1,
    isActive: true,
    createdAt: BASE_TS - 2 * 24 * 60 * 60 * 1000,
    updatedAt: BASE_TS - 2 * 24 * 60 * 60 * 1000,
  },
];

// ─── Files ────────────────────────────────────────────────────────────────────

export const MOCK_FILES: FileItem[] = [
  {
    id: "file-1",
    workspaceId: "ws-cynerza-sales",
    uploadedBy: "user-1",
    name: "company-overview.pdf",
    originalFilename: "company-overview.pdf",
    mimeType: "application/pdf",
    type: "application/pdf",
    sizeBytes: 245 * 1024,
    status: "READY",
    url: "#",
    uploadedAt: BASE_TS - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: "file-2",
    workspaceId: "ws-cynerza-tech",
    uploadedBy: "user-3",
    name: "api-spec.yaml",
    originalFilename: "api-spec.yaml",
    mimeType: "text/yaml",
    type: "text/yaml",
    sizeBytes: 12 * 1024,
    status: "READY",
    url: "#",
    uploadedAt: BASE_TS - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: "file-3",
    workspaceId: "ws-personal-default",
    uploadedBy: "user-1",
    name: "notes.md",
    originalFilename: "notes.md",
    mimeType: "text/markdown",
    type: "text/markdown",
    sizeBytes: 3 * 1024,
    status: "READY",
    url: "#",
    uploadedAt: BASE_TS - 26 * 60 * 60 * 1000,
  },
  {
    id: "file-4",
    workspaceId: "ws-cynerza-client-tc",
    uploadedBy: "user-1",
    name: "client-requirements.pdf",
    originalFilename: "client-requirements.pdf",
    mimeType: "application/pdf",
    type: "application/pdf",
    sizeBytes: 187 * 1024,
    status: "READY",
    url: "#",
    uploadedAt: BASE_TS - 4 * 24 * 60 * 60 * 1000,
  },
  {
    id: "file-5",
    workspaceId: "ws-cynerza-sales",
    uploadedBy: "user-2",
    name: "pricing-sheet.csv",
    originalFilename: "pricing-sheet.csv",
    mimeType: "text/csv",
    type: "text/csv",
    sizeBytes: 42 * 1024,
    status: "READY",
    url: "#",
    uploadedAt: BASE_TS - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: "file-6",
    workspaceId: "ws-cynerza-sales",
    uploadedBy: "user-1",
    name: "company-profile.docx",
    originalFilename: "company-profile.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sizeBytes: 312 * 1024,
    status: "PROCESSING",
    url: "#",
    uploadedAt: BASE_TS - 6 * 24 * 60 * 60 * 1000,
  },
  {
    id: "file-7",
    workspaceId: "ws-cynerza-tech",
    uploadedBy: "user-3",
    name: "ui-reference.png",
    originalFilename: "ui-reference.png",
    mimeType: "image/png",
    type: "image/png",
    sizeBytes: 856 * 1024,
    status: "READY",
    url: "#",
    uploadedAt: BASE_TS - 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: "file-8",
    workspaceId: "ws-cynerza-client-tc",
    uploadedBy: "user-2",
    name: "tech-corner-brief.docx",
    originalFilename: "tech-corner-brief.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sizeBytes: 98 * 1024,
    status: "READY",
    url: "#",
    uploadedAt: BASE_TS - 8 * 24 * 60 * 60 * 1000,
  },
  {
    id: "file-9",
    workspaceId: "ws-cynerza-hr",
    uploadedBy: "user-4",
    name: "offer-letter-template.docx",
    originalFilename: "offer-letter-template.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sizeBytes: 55 * 1024,
    status: "READY",
    url: "#",
    uploadedAt: BASE_TS - 10 * 24 * 60 * 60 * 1000,
  },
  {
    id: "file-10",
    workspaceId: "ws-cynerza-tech",
    uploadedBy: "user-1",
    name: "db-schema.png",
    originalFilename: "db-schema.png",
    mimeType: "image/png",
    type: "image/png",
    sizeBytes: 234 * 1024,
    status: "READY",
    url: "#",
    uploadedAt: BASE_TS - 5 * 24 * 60 * 60 * 1000,
  },
];

// ─── Workspace Contexts ───────────────────────────────────────────────────────

export const MOCK_WORKSPACE_CONTEXTS: WorkspaceContext[] = [
  {
    workspaceId: "ws-personal-default",
    summary: "Personal workspace for general tasks, research, and notes.",
    stats: { chats: 2, files: 1, artifacts: 1, members: 1 },
  },
  {
    workspaceId: "ws-cynerza-sales",
    summary: "Sales pipeline management, client outreach, and pitch preparation workspace.",
    recentActivity: "Q2 Strategy Draft updated · BDE Follow-up Email saved",
    stats: { chats: 4, files: 3, artifacts: 3, members: 5 },
  },
  {
    workspaceId: "ws-cynerza-tech",
    summary: "Engineering discussions, architecture decisions, and technical documentation.",
    recentActivity: "Backend Architecture Notes v3 saved · FastAPI snippet added",
    stats: { chats: 3, files: 3, artifacts: 3, members: 5 },
  },
  {
    workspaceId: "ws-cynerza-hr",
    summary: "Recruitment, onboarding, and HR process management.",
    stats: { chats: 2, files: 1, artifacts: 0, members: 5 },
  },
  {
    workspaceId: "ws-cynerza-client-tc",
    summary: "Project workspace for Tech Corner client — proposal drafting and coordination.",
    recentActivity: "Tech Corner Proposal v2 saved",
    stats: { chats: 2, files: 2, artifacts: 1, members: 5 },
  },
  {
    workspaceId: "ws-cynerza-client-gym",
    summary: "Project workspace for Popular Gym client — feature planning and app design.",
    stats: { chats: 1, files: 0, artifacts: 0, members: 5 },
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
