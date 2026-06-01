/** Core domain types for the Marijoa platform — mirrors backend concepts */

export type AppMode = "personal" | "organization";
export type RightPanelTab = "artifacts" | "files" | "context";
export type OrganizationType = "PERSONAL" | "COMPANY";
export type OrganizationRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
export type MemberStatus = "ACTIVE" | "INVITED" | "SUSPENDED" | "REMOVED";
export type MessageRole = "user" | "assistant" | "system" | "tool";

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
}

export interface Artifact {
  id: string;
  workspaceId: string;
  chatId?: string;
  type: "code" | "document" | "chart" | "table";
  title: string;
  language?: string;
  content: string;
  createdAt: number;
}

export interface FileItem {
  id: string;
  workspaceId: string;
  chatId?: string;
  name: string;
  type: string;
  sizeBytes: number;
  url: string;
  uploadedAt: number;
}
