/**
 * Raw backend response shapes. These mirror the FastAPI Pydantic schemas
 * exactly — UUIDs are strings, datetimes are ISO 8601 strings, enums are the
 * uppercase string literals the backend persists.
 *
 * Adapters in `src/lib/api/adapters.ts` convert these into the frontend
 * domain shapes declared in `src/types/marijoa.ts`.
 */

export type ISODateString = string;
export type UUID = string;

// Shared enums (backend canonical casing) -------------------------------------

export type OrgType = "PERSONAL" | "COMPANY";
export type OrgRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";
export type OrgMemberStatus = "ACTIVE" | "INVITED" | "SUSPENDED" | "REMOVED";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
export type WorkspaceMemberStatus = "ACTIVE" | "INVITED" | "SUSPENDED" | "REMOVED";

export type ChatStatus = "ACTIVE" | "ARCHIVED" | "DELETED";
export type MessageRoleApi = "user" | "assistant" | "system" | "tool";

export type ArtifactTypeApi =
  | "document"
  | "code"
  | "prompt"
  | "email"
  | "proposal"
  | "note";

export type FileStatusApi = "UPLOADED" | "PROCESSING" | "READY" | "FAILED" | "DELETED";

// Auth -----------------------------------------------------------------------

export interface AuthUserResponse {
  id: UUID;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: ISODateString;
}

export interface AuthResponse {
  user: AuthUserResponse;
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
}

// Personal context -----------------------------------------------------------

export interface PersonalUserRead {
  id: UUID;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: ISODateString;
}

export interface PersonalOrganizationRead {
  id: UUID;
  name: string;
  type: OrgType;
}

export interface PersonalWorkspaceRead {
  id: UUID;
  name: string;
  organization_id: UUID;
}

export interface PersonalContextResponse {
  user: PersonalUserRead;
  personal_organization: PersonalOrganizationRead;
  personal_workspace: PersonalWorkspaceRead;
}

// Organizations --------------------------------------------------------------

export interface OrganizationRead {
  id: UUID;
  name: string;
  slug: string;
  owner_id: UUID;
  type: OrgType;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface OrganizationWithRoleRead extends OrganizationRead {
  current_user_role: OrgRole;
}

export interface OrganizationCreateRequest {
  name: string;
  slug?: string | null;
}

export interface OrganizationMemberRead {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  role: OrgRole;
  status: OrgMemberStatus;
  created_at: ISODateString;
  updated_at: ISODateString;
  user_full_name: string;
  user_email: string;
  user_avatar_url: string | null;
}

export interface OrganizationMemberCreateRequest {
  email: string;
  role?: OrgRole;
}

export interface OrganizationMemberUpdateRequest {
  role?: OrgRole | null;
  status?: OrgMemberStatus | null;
}

// Workspaces -----------------------------------------------------------------

export interface WorkspaceRead {
  id: UUID;
  organization_id: UUID;
  name: string;
  description: string | null;
  system_instruction: string | null;
  created_by: UUID;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface WorkspaceWithRoleRead extends WorkspaceRead {
  current_user_role: WorkspaceRole;
}

export interface WorkspaceCreateRequest {
  organization_id: UUID;
  name: string;
  description?: string | null;
  system_instruction?: string | null;
}

export interface WorkspaceUpdateRequest {
  name?: string | null;
  description?: string | null;
  system_instruction?: string | null;
  is_active?: boolean | null;
}

// Chats ----------------------------------------------------------------------

export interface ChatRead {
  id: UUID;
  workspace_id: UUID;
  user_id: UUID;
  title: string;
  status: ChatStatus;
  last_message_at: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface ChatCreateRequest {
  workspace_id: UUID;
  title?: string | null;
}

export interface ChatUpdateRequest {
  title?: string | null;
  status?: ChatStatus | null;
}

// Messages -------------------------------------------------------------------

export interface MessageRead {
  id: UUID;
  chat_id: UUID;
  user_id: UUID | null;
  role: MessageRoleApi;
  content: string;
  model: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface MessagesListResponse {
  items: MessageRead[];
  total: number;
}

export interface MessageCreateRequest {
  content: string;
}

// AI Gateway -----------------------------------------------------------------

export interface AIRespondRequest {
  content: string;
}

export interface AIRespondResponse {
  user_message: MessageRead;
  assistant_message: MessageRead;
}

// Artifacts ------------------------------------------------------------------

export interface ArtifactRead {
  id: UUID;
  workspace_id: UUID;
  chat_id: UUID | null;
  created_by: UUID;
  title: string;
  type: ArtifactTypeApi;
  content: string;
  version: number;
  is_active: boolean;
  metadata_json: Record<string, unknown> | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface ArtifactListResponse {
  items: ArtifactRead[];
  total: number;
}

export interface ArtifactCreateRequest {
  workspace_id: UUID;
  chat_id?: UUID | null;
  title: string;
  type: ArtifactTypeApi;
  content: string;
  metadata_json?: Record<string, unknown> | null;
}

export interface ArtifactUpdateRequest {
  title?: string | null;
  content?: string | null;
  type?: ArtifactTypeApi | null;
  metadata_json?: Record<string, unknown> | null;
}

// Files ----------------------------------------------------------------------

export interface FileRead {
  id: UUID;
  workspace_id: UUID;
  uploaded_by: UUID;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  size_bytes: number;
  storage_provider: string;
  blob_container: string;
  status: FileStatusApi;
  checksum_sha256: string | null;
  metadata_json: Record<string, unknown> | null;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface FileListResponse {
  items: FileRead[];
  total: number;
}

export interface FileDownloadUrlResponse {
  download_url: string;
  expires_at: ISODateString;
}

// Admin ----------------------------------------------------------------------

export interface AdminUserRead {
  id: UUID;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  org_role: string;
  org_member_status: string;
  joined_at: ISODateString;
}

export interface AdminUserListResponse {
  items: AdminUserRead[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface AdminAuditLogRead {
  id: UUID;
  organization_id: UUID | null;
  workspace_id: UUID | null;
  user_id: UUID | null;
  action: string;
  entity_type: string;
  entity_id: UUID | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: ISODateString;
}

export interface AdminAuditLogListResponse {
  items: AdminAuditLogRead[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface AdminUsageSummaryResponse {
  organization_id: UUID;
  users_count: number;
  active_users_count: number;
  workspaces_count: number;
  chats_count: number;
  messages_count: number;
  artifacts_count: number;
  files_count: number;
  storage_bytes: number;
}

// Health ---------------------------------------------------------------------

export interface HealthResponse {
  status: string;
  service?: string;
  api_version?: string;
}
