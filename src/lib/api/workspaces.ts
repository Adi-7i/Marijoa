"use client";

import { apiClient } from "./client";
import { adaptWorkspace } from "./adapters";
import type {
  WorkspaceCreateRequest,
  WorkspaceRead,
  WorkspaceUpdateRequest,
  WorkspaceWithRoleRead,
} from "./types";
import type { Workspace } from "@/types/marijoa";

export async function listWorkspaces(orgId?: string): Promise<Workspace[]> {
  const payload = await apiClient.get<WorkspaceWithRoleRead[]>("/workspaces", {
    query: orgId ? { organization_id: orgId } : undefined,
  });
  return payload.map((w) => adaptWorkspace(w));
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const payload = await apiClient.get<WorkspaceWithRoleRead>(`/workspaces/${workspaceId}`);
  return adaptWorkspace(payload);
}

export async function createWorkspace(input: {
  organizationId: string;
  name: string;
  description?: string;
  systemInstruction?: string;
}): Promise<Workspace> {
  const body: WorkspaceCreateRequest = {
    organization_id: input.organizationId,
    name: input.name,
    description: input.description ?? null,
    system_instruction: input.systemInstruction ?? null,
  };
  const payload = await apiClient.post<WorkspaceRead>("/workspaces", { json: body });
  return adaptWorkspace(payload);
}

export async function updateWorkspace(
  workspaceId: string,
  input: {
    name?: string;
    description?: string | null;
    systemInstruction?: string | null;
    isActive?: boolean;
  }
): Promise<Workspace> {
  const body: WorkspaceUpdateRequest = {
    name: input.name ?? null,
    description: input.description ?? null,
    system_instruction: input.systemInstruction ?? null,
    is_active: input.isActive ?? null,
  };
  const payload = await apiClient.patch<WorkspaceRead>(`/workspaces/${workspaceId}`, { json: body });
  return adaptWorkspace(payload);
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await apiClient.delete(`/workspaces/${workspaceId}`);
}
