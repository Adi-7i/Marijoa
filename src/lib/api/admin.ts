"use client";

import { apiClient } from "./client";
import { adaptAdminUserAsMember, adaptAdminUsage, adaptAuditLog } from "./adapters";
import type {
  AdminAuditLogListResponse,
  AdminUserListResponse,
  AdminUsageSummaryResponse,
} from "./types";
import type { AdminUsageSummary, AuditLog, OrganizationMember } from "@/types/marijoa";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface AdminUsersQuery {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listAdminUsers(
  organizationId: string,
  query: AdminUsersQuery = {}
): Promise<PaginatedResult<OrganizationMember>> {
  const payload = await apiClient.get<AdminUserListResponse>(
    `/admin/organizations/${organizationId}/users`,
    {
      query: {
        role: query.role,
        status: query.status,
        search: query.search,
        page: query.page,
        page_size: query.pageSize,
      },
    }
  );
  return {
    items: payload.items.map((u) => adaptAdminUserAsMember(u, organizationId)),
    total: payload.total,
    page: payload.page,
    pageSize: payload.page_size,
    pages: payload.pages,
  };
}

export interface AdminAuditLogsQuery {
  action?: string;
  userId?: string;
  workspaceId?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export async function listAdminAuditLogs(
  organizationId: string,
  query: AdminAuditLogsQuery = {}
): Promise<PaginatedResult<AuditLog>> {
  const payload = await apiClient.get<AdminAuditLogListResponse>(
    `/admin/organizations/${organizationId}/audit-logs`,
    {
      query: {
        action: query.action,
        user_id: query.userId,
        workspace_id: query.workspaceId,
        entity_type: query.entityType,
        date_from: query.dateFrom,
        date_to: query.dateTo,
        page: query.page,
        page_size: query.pageSize,
      },
    }
  );
  return {
    items: payload.items.map(adaptAuditLog),
    total: payload.total,
    page: payload.page,
    pageSize: payload.page_size,
    pages: payload.pages,
  };
}

export async function getAdminUsage(organizationId: string): Promise<AdminUsageSummary> {
  const payload = await apiClient.get<AdminUsageSummaryResponse>(
    `/admin/organizations/${organizationId}/usage`
  );
  return adaptAdminUsage(payload);
}
