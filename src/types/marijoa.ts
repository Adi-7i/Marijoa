/** Core domain types for the Marijoa platform — mirrors backend concepts */

export type AppMode = "personal" | "organization";
export type RightPanelTab = "artifacts" | "files" | "context";
export type OrganizationType = "PERSONAL" | "COMPANY";
export type OrganizationRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
export type MemberStatus = "ACTIVE" | "INVITED" | "SUSPENDED" | "REMOVED";
export type MessageRole = "user" | "assistant" | "system" | "tool";
export type ArtifactType = "code" | "document" | "chart" | "table" | "prompt" | "email" | "proposal" | "note";
export type FileStatus = "UPLOADED" | "PROCESSING" | "READY" | "FAILED" | "DELETED";

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  logoUrl?: string;
  role: OrganizationRole;
  memberCount?: number;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  systemInstruction?: string;
  isDefault: boolean;
  userRole?: OrganizationRole;
  chatCount?: number;
  fileCount?: number;
  artifactCount?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  fullName: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  role: OrganizationRole;
  status: MemberStatus;
  joinedAt?: number;
}

export interface Chat {
  id: string;
  workspaceId: string;
  organizationId: string;
  title: string;
  updatedAt: number;
  messageCount: number;
}

export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  sources?: CitationSource[];
  webSearchUsed?: boolean;
  webMode?: WebMode;
  searchQueries?: string[];
}

export type WebMode = "auto" | "off" | "search";

export interface CitationSource {
  index: number;
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
}

export interface Artifact {
  id: string;
  workspaceId: string;
  chatId?: string;
  createdBy?: string;
  title: string;
  type: ArtifactType;
  language?: string;
  content: string;
  version?: number;
  isActive?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface FileItem {
  id: string;
  workspaceId: string;
  chatId?: string;
  uploadedBy?: string;
  name: string;
  originalFilename?: string;
  mimeType?: string;
  type: string;
  sizeBytes: number;
  status?: FileStatus;
  url: string;
  uploadedAt: number;
  updatedAt?: number;
}

export type AuditAction =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "ORGANIZATION_CREATED"
  | "ORGANIZATION_MEMBER_ADDED"
  | "WORKSPACE_CREATED"
  | "WORKSPACE_UPDATED"
  | "WORKSPACE_DELETED"
  | "CHAT_CREATED"
  | "CHAT_UPDATED"
  | "CHAT_DELETED"
  | "MESSAGE_CREATED"
  | "AI_RESPONSE_CREATED"
  | "AI_STREAM_COMPLETED"
  | "ARTIFACT_CREATED"
  | "ARTIFACT_UPDATED"
  | "ARTIFACT_DELETED"
  | "FILE_UPLOADED"
  | "FILE_DELETED"
  | "ADMIN_USERS_VIEWED"
  | "ADMIN_AUDIT_LOGS_VIEWED"
  | "ADMIN_USAGE_VIEWED";

export interface AuditLog {
  id: string;
  organizationId: string;
  workspaceId?: string;
  workspaceName?: string;
  userId?: string;
  userName?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  metadata?: Record<string, string>;
  createdAt: number;
}

export type InvitationStatus =
  | "PENDING_SIGNUP"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type InvitableRole = "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: InvitableRole;
  status: InvitationStatus;
  invitedBy: string;
  acceptedUserId?: string;
  expiresAt: number;
  createdAt: number;
  acceptedAt?: number;
  approvedAt?: number;
  rejectedAt?: number;
}

export interface OrganizationInvitationWithUrl extends OrganizationInvitation {
  inviteUrl: string;
}

export interface InvitationValidation {
  valid: boolean;
  organizationName: string;
  email: string;
  role: InvitableRole;
  status: InvitationStatus;
  expiresAt: number;
}

export interface InvitationAcceptResult {
  status: InvitationStatus;
  organizationName: string;
  message: string;
}

export interface AdminUsageSummary {
  organizationId: string;
  usersCount: number;
  activeUsersCount: number;
  workspacesCount: number;
  chatsCount: number;
  messagesCount: number;
  artifactsCount: number;
  filesCount: number;
  storageBytes: number;
}

export interface WorkspaceContext {
  workspaceId: string;
  summary?: string;
  recentActivity?: string;
  stats: {
    chats: number;
    files: number;
    artifacts: number;
    members: number;
  };
}
