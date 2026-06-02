"use client";

import { apiClient } from "./client";
import {
  adaptOrganization,
  adaptOrganizationMember,
} from "./adapters";
import type {
  OrganizationCreateRequest,
  OrganizationMemberCreateRequest,
  OrganizationMemberRead,
  OrganizationMemberUpdateRequest,
  OrganizationRead,
  OrganizationWithRoleRead,
} from "./types";
import type { Organization, OrganizationMember, OrganizationRole, MemberStatus } from "@/types/marijoa";

export async function listMyOrganizations(): Promise<Organization[]> {
  const payload = await apiClient.get<OrganizationWithRoleRead[]>("/organizations/me");
  return payload.map(adaptOrganization);
}

export async function createOrganization(input: {
  name: string;
  slug?: string;
}): Promise<Organization> {
  const body: OrganizationCreateRequest = {
    name: input.name,
    slug: input.slug ?? null,
  };
  const payload = await apiClient.post<OrganizationRead>("/organizations", { json: body });
  // /organizations POST returns OrganizationRead (no current_user_role) — assume OWNER.
  return adaptOrganization({ ...payload, current_user_role: "OWNER" });
}

export async function getOrganization(orgId: string): Promise<Organization> {
  const payload = await apiClient.get<OrganizationRead>(`/organizations/${orgId}`);
  return adaptOrganization(payload);
}

export async function listOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  const payload = await apiClient.get<OrganizationMemberRead[]>(`/organizations/${orgId}/members`);
  return payload.map(adaptOrganizationMember);
}

export async function addOrganizationMember(
  orgId: string,
  input: { email: string; role?: OrganizationRole }
): Promise<OrganizationMember> {
  const body: OrganizationMemberCreateRequest = {
    email: input.email,
    role: (input.role ?? "MEMBER") as OrganizationMemberCreateRequest["role"],
  };
  const payload = await apiClient.post<OrganizationMemberRead>(
    `/organizations/${orgId}/members`,
    { json: body }
  );
  return adaptOrganizationMember(payload);
}

export async function updateOrganizationMember(
  orgId: string,
  memberId: string,
  input: { role?: OrganizationRole; status?: MemberStatus }
): Promise<OrganizationMember> {
  const body: OrganizationMemberUpdateRequest = {
    role: input.role ? (input.role as OrganizationMemberUpdateRequest["role"]) : null,
    status: input.status ? (input.status as OrganizationMemberUpdateRequest["status"]) : null,
  };
  const payload = await apiClient.patch<OrganizationMemberRead>(
    `/organizations/${orgId}/members/${memberId}`,
    { json: body }
  );
  return adaptOrganizationMember(payload);
}
