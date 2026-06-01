/**
 * Translates raw backend response shapes into the frontend domain types in
 * `src/types/marijoa.ts`. Adapters absorb naming differences (snake_case →
 * camelCase), normalize datetimes (ISO strings → millisecond timestamps),
 * compute derived display fields (initials), and surface only what UI cares
 * about.
 *
 * Every API service function returns adapted domain shapes — components never
 * see raw backend payloads.
 */

import type {
  Artifact,
  ArtifactType,
  AuditLog,
  AuditAction,
  Chat,
  FileItem,
  FileStatus,
  Message,
  Organization,
  OrganizationMember,
  OrganizationRole,
  OrganizationType,
  User,
  Workspace,
  WorkspaceContext,
  AdminUsageSummary,
  MessageRole,
  MemberStatus,
} from "@/types/marijoa";
import type {
  AdminAuditLogRead,
  AdminUsageSummaryResponse,
  AdminUserRead,
  ArtifactRead,
  ArtifactTypeApi,
  AuthUserResponse,
  ChatRead,
  FileRead,
  FileStatusApi,
  MessageRead,
  OrganizationMemberRead,
  OrganizationRead,
  OrganizationWithRoleRead,
  PersonalOrganizationRead,
  PersonalWorkspaceRead,
  WorkspaceRead,
  WorkspaceWithRoleRead,
} from "./types";

// --- helpers ----------------------------------------------------------------

export function isoToMs(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

export function isoToMsRequired(value: string | null | undefined, fallback = 0): number {
  const ms = isoToMs(value);
  return ms > 0 ? ms : fallback;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- user / auth ------------------------------------------------------------

export function adaptAuthUser(raw: AuthUserResponse): User {
  return {
    id: raw.id,
    name: raw.full_name,
    email: raw.email,
    initials: initialsFromName(raw.full_name),
    avatarUrl: raw.avatar_url ?? undefined,
  };
}

// --- organizations ----------------------------------------------------------

export function adaptOrganization(raw: OrganizationWithRoleRead | OrganizationRead): Organization {
  const role = (("current_user_role" in raw && raw.current_user_role) || "OWNER") as OrganizationRole;
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    type: raw.type as OrganizationType,
    role,
  };
}

export function adaptPersonalOrganization(raw: PersonalOrganizationRead): Organization {
  return {
    id: raw.id,
    name: raw.name,
    slug: slugify(raw.name),
    type: raw.type as OrganizationType,
    role: "OWNER",
  };
}

const VALID_MEMBER_STATUS: ReadonlySet<MemberStatus> = new Set([
  "ACTIVE",
  "INVITED",
  "SUSPENDED",
  "REMOVED",
]);

function normalizeMemberStatus(status: string): MemberStatus {
  return VALID_MEMBER_STATUS.has(status as MemberStatus)
    ? (status as MemberStatus)
    : "ACTIVE";
}

const VALID_ORG_ROLE: ReadonlySet<OrganizationRole> = new Set([
  "OWNER",
  "ADMIN",
  "MANAGER",
  "MEMBER",
  "VIEWER",
]);

function normalizeOrgRole(role: string): OrganizationRole {
  return VALID_ORG_ROLE.has(role as OrganizationRole)
    ? (role as OrganizationRole)
    : "MEMBER";
}

export function adaptOrganizationMember(raw: OrganizationMemberRead): OrganizationMember {
  return {
    id: raw.id,
    organizationId: raw.organization_id,
    userId: raw.user_id,
    fullName: raw.user_full_name,
    email: raw.user_email,
    initials: initialsFromName(raw.user_full_name),
    avatarUrl: raw.user_avatar_url ?? undefined,
    role: normalizeOrgRole(raw.role),
    status: normalizeMemberStatus(raw.status),
    joinedAt: isoToMs(raw.created_at),
  };
}

// --- workspaces -------------------------------------------------------------

export function adaptWorkspace(
  raw: WorkspaceWithRoleRead | WorkspaceRead,
  opts: { isDefault?: boolean } = {}
): Workspace {
  const role = ("current_user_role" in raw && raw.current_user_role) || undefined;
  return {
    id: raw.id,
    organizationId: raw.organization_id,
    name: raw.name,
    description: raw.description ?? undefined,
    systemInstruction: raw.system_instruction ?? undefined,
    isDefault: opts.isDefault ?? false,
    userRole: role ? normalizeOrgRole(role) : undefined,
    createdAt: isoToMs(raw.created_at),
    updatedAt: isoToMs(raw.updated_at),
  };
}

export function adaptPersonalWorkspace(raw: PersonalWorkspaceRead): Workspace {
  return {
    id: raw.id,
    organizationId: raw.organization_id,
    name: raw.name,
    isDefault: true,
    userRole: "OWNER",
    createdAt: 0,
  };
}

// --- chats / messages -------------------------------------------------------

export function adaptChat(
  raw: ChatRead,
  organizationId?: string
): Chat {
  const updatedAt = isoToMs(raw.last_message_at) || isoToMs(raw.updated_at) || isoToMs(raw.created_at);
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    organizationId: organizationId ?? "",
    title: raw.title,
    updatedAt,
    messageCount: 0,
  };
}

const VALID_MESSAGE_ROLE: ReadonlySet<MessageRole> = new Set([
  "user",
  "assistant",
  "system",
  "tool",
]);

function normalizeMessageRole(role: string): MessageRole {
  return VALID_MESSAGE_ROLE.has(role as MessageRole) ? (role as MessageRole) : "user";
}

export function adaptMessage(raw: MessageRead): Message {
  return {
    id: raw.id,
    chatId: raw.chat_id,
    role: normalizeMessageRole(raw.role),
    content: raw.content,
    timestamp: isoToMsRequired(raw.created_at),
  };
}

// --- artifacts --------------------------------------------------------------

const ARTIFACT_TYPES: ReadonlySet<ArtifactType> = new Set([
  "code",
  "document",
  "chart",
  "table",
  "prompt",
  "email",
  "proposal",
  "note",
]);

export function normalizeArtifactType(type: string): ArtifactType {
  return ARTIFACT_TYPES.has(type as ArtifactType) ? (type as ArtifactType) : "note";
}

export function toBackendArtifactType(type: ArtifactType): ArtifactTypeApi {
  // Backend only supports a subset; map chart/table to document.
  if (type === "chart" || type === "table") return "document";
  return type as ArtifactTypeApi;
}

export function adaptArtifact(raw: ArtifactRead): Artifact {
  const metadata = raw.metadata_json ?? null;
  const language =
    metadata && typeof metadata === "object" && typeof (metadata as Record<string, unknown>).language === "string"
      ? ((metadata as Record<string, unknown>).language as string)
      : undefined;

  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    chatId: raw.chat_id ?? undefined,
    createdBy: raw.created_by,
    title: raw.title,
    type: normalizeArtifactType(raw.type),
    language,
    content: raw.content,
    version: raw.version,
    isActive: raw.is_active,
    createdAt: isoToMs(raw.created_at),
    updatedAt: isoToMs(raw.updated_at),
  };
}

// --- files ------------------------------------------------------------------

const FILE_STATUSES: ReadonlySet<FileStatus> = new Set([
  "UPLOADED",
  "PROCESSING",
  "READY",
  "FAILED",
  "DELETED",
]);

function normalizeFileStatus(status: string): FileStatus {
  return FILE_STATUSES.has(status as FileStatus) ? (status as FileStatus) : "UPLOADED";
}

export function adaptFile(raw: FileRead): FileItem {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    uploadedBy: raw.uploaded_by,
    name: raw.original_filename,
    originalFilename: raw.original_filename,
    mimeType: raw.mime_type,
    type: mimeTypeToShortType(raw.mime_type, raw.original_filename),
    sizeBytes: raw.size_bytes,
    status: normalizeFileStatus(raw.status as FileStatusApi),
    url: "",
    uploadedAt: isoToMs(raw.created_at),
    updatedAt: isoToMs(raw.updated_at),
  };
}

function mimeTypeToShortType(mime: string, filename: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes("pdf")) return "pdf";
  if (lower.startsWith("image/")) return lower.split("/")[1] ?? "image";
  if (lower.includes("word") || lower.includes("officedocument.wordprocessingml")) return "docx";
  if (lower.includes("excel") || lower.includes("spreadsheetml")) return "xlsx";
  if (lower.includes("powerpoint") || lower.includes("presentationml")) return "pptx";
  if (lower.includes("markdown") || filename.toLowerCase().endsWith(".md")) return "md";
  if (lower.includes("csv")) return "csv";
  if (lower.includes("yaml") || filename.toLowerCase().endsWith(".yaml") || filename.toLowerCase().endsWith(".yml")) {
    return "yaml";
  }
  if (lower.includes("json")) return "json";
  if (lower.startsWith("text/")) return "txt";
  const ext = filename.includes(".") ? filename.split(".").pop() : undefined;
  return ext ? ext.toLowerCase() : "file";
}

// --- admin ------------------------------------------------------------------

export function adaptAdminUserAsMember(
  raw: AdminUserRead,
  organizationId: string
): OrganizationMember {
  return {
    id: raw.id,
    organizationId,
    userId: raw.id,
    fullName: raw.full_name,
    email: raw.email,
    initials: initialsFromName(raw.full_name),
    avatarUrl: raw.avatar_url ?? undefined,
    role: normalizeOrgRole(raw.org_role),
    status: normalizeMemberStatus(raw.org_member_status),
    joinedAt: isoToMs(raw.joined_at),
  };
}

const AUDIT_ACTIONS: ReadonlySet<string> = new Set<AuditAction>([
  "USER_LOGIN",
  "USER_LOGOUT",
  "ORGANIZATION_CREATED",
  "ORGANIZATION_MEMBER_ADDED",
  "WORKSPACE_CREATED",
  "WORKSPACE_UPDATED",
  "WORKSPACE_DELETED",
  "CHAT_CREATED",
  "CHAT_UPDATED",
  "CHAT_DELETED",
  "MESSAGE_CREATED",
  "AI_RESPONSE_CREATED",
  "AI_STREAM_COMPLETED",
  "ARTIFACT_CREATED",
  "ARTIFACT_UPDATED",
  "ARTIFACT_DELETED",
  "FILE_UPLOADED",
  "FILE_DELETED",
  "ADMIN_USERS_VIEWED",
  "ADMIN_AUDIT_LOGS_VIEWED",
  "ADMIN_USAGE_VIEWED",
]);

function normalizeAuditAction(action: string): AuditAction {
  return AUDIT_ACTIONS.has(action) ? (action as AuditAction) : (action as AuditAction);
}

export function adaptAuditLog(raw: AdminAuditLogRead): AuditLog {
  const metadata = (raw.metadata_json ?? {}) as Record<string, unknown>;
  const flatMetadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) continue;
    flatMetadata[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return {
    id: raw.id,
    organizationId: raw.organization_id ?? "",
    workspaceId: raw.workspace_id ?? undefined,
    userId: raw.user_id ?? undefined,
    userName: typeof metadata.user_name === "string" ? (metadata.user_name as string) : undefined,
    action: normalizeAuditAction(raw.action),
    entityType: raw.entity_type,
    entityId: raw.entity_id ?? undefined,
    ipAddress: raw.ip_address ?? undefined,
    metadata: Object.keys(flatMetadata).length > 0 ? flatMetadata : undefined,
    createdAt: isoToMs(raw.created_at),
  };
}

export function adaptAdminUsage(raw: AdminUsageSummaryResponse): AdminUsageSummary {
  return {
    organizationId: raw.organization_id,
    usersCount: raw.users_count,
    activeUsersCount: raw.active_users_count,
    workspacesCount: raw.workspaces_count,
    chatsCount: raw.chats_count,
    messagesCount: raw.messages_count,
    artifactsCount: raw.artifacts_count,
    filesCount: raw.files_count,
    storageBytes: raw.storage_bytes,
  };
}

// --- workspace context (purely derived locally) -----------------------------

export function buildWorkspaceContext(
  workspaceId: string,
  workspaceName: string | undefined,
  counts: { chats: number; files: number; artifacts: number; members: number }
): WorkspaceContext {
  return {
    workspaceId,
    summary: workspaceName ? `Workspace: ${workspaceName}` : undefined,
    stats: counts,
  };
}
