"use client";

import { apiClient } from "./client";
import {
  adaptInvitation,
  adaptInvitationAccept,
  adaptInvitationCreate,
  adaptInvitationValidate,
} from "./adapters";
import type {
  InvitationAcceptExistingRequest,
  InvitationAcceptRequest,
  InvitationAcceptResponse,
  InvitationCreateRequest,
  InvitationCreateResponse,
  InvitationRead,
  InvitationStatus,
  InvitationValidateResponse,
  InvitableRole,
} from "./types";
import type {
  InvitationAcceptResult,
  InvitationValidation,
  OrganizationInvitation,
  OrganizationInvitationWithUrl,
} from "@/types/marijoa";

export const EXISTING_USER_LOGIN_REQUIRED = "EXISTING_USER_LOGIN_REQUIRED";

// ---------------------------------------------------------------------------
// Admin/Owner endpoints
// ---------------------------------------------------------------------------

export async function createInvitation(
  organizationId: string,
  input: { email: string; role: InvitableRole }
): Promise<OrganizationInvitationWithUrl> {
  const body: InvitationCreateRequest = {
    email: input.email,
    role: input.role,
  };
  const payload = await apiClient.post<InvitationCreateResponse>(
    `/organizations/${organizationId}/invitations`,
    { json: body }
  );
  return adaptInvitationCreate(payload);
}

export async function listInvitations(
  organizationId: string,
  params: { status?: InvitationStatus; limit?: number; offset?: number } = {}
): Promise<OrganizationInvitation[]> {
  const payload = await apiClient.get<InvitationRead[]>(
    `/organizations/${organizationId}/invitations`,
    { query: { status: params.status, limit: params.limit, offset: params.offset } }
  );
  return payload.map(adaptInvitation);
}

export async function approveInvitation(
  organizationId: string,
  invitationId: string
): Promise<OrganizationInvitation> {
  const payload = await apiClient.post<InvitationRead>(
    `/organizations/${organizationId}/invitations/${invitationId}/approve`
  );
  return adaptInvitation(payload);
}

export async function rejectInvitation(
  organizationId: string,
  invitationId: string
): Promise<OrganizationInvitation> {
  const payload = await apiClient.post<InvitationRead>(
    `/organizations/${organizationId}/invitations/${invitationId}/reject`
  );
  return adaptInvitation(payload);
}

export async function cancelInvitation(
  organizationId: string,
  invitationId: string
): Promise<OrganizationInvitation> {
  const payload = await apiClient.post<InvitationRead>(
    `/organizations/${organizationId}/invitations/${invitationId}/cancel`
  );
  return adaptInvitation(payload);
}

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

export async function validateInvitation(
  token: string
): Promise<InvitationValidation> {
  const payload = await apiClient.get<InvitationValidateResponse>(
    `/invitations/validate/${encodeURIComponent(token)}`,
    { authRequired: false }
  );
  return adaptInvitationValidate(payload);
}

export async function acceptInvitation(input: {
  token: string;
  fullName: string;
  password: string;
}): Promise<InvitationAcceptResult> {
  const body: InvitationAcceptRequest = {
    token: input.token,
    full_name: input.fullName,
    password: input.password,
  };
  const payload = await apiClient.post<InvitationAcceptResponse>(
    "/invitations/accept",
    { json: body, authRequired: false }
  );
  return adaptInvitationAccept(payload);
}

export async function acceptInvitationExisting(
  token: string
): Promise<InvitationAcceptResult> {
  const body: InvitationAcceptExistingRequest = { token };
  const payload = await apiClient.post<InvitationAcceptResponse>(
    "/invitations/accept-existing",
    { json: body }
  );
  return adaptInvitationAccept(payload);
}
