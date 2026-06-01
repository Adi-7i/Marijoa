"use client";

import { apiClient } from "./client";
import { adaptArtifact, toBackendArtifactType } from "./adapters";
import type {
  ArtifactCreateRequest,
  ArtifactListResponse,
  ArtifactRead,
  ArtifactUpdateRequest,
} from "./types";
import type { Artifact, ArtifactType } from "@/types/marijoa";

export async function listArtifacts(input: {
  workspaceId: string;
  chatId?: string;
  type?: ArtifactType;
  limit?: number;
  offset?: number;
}): Promise<{ items: Artifact[]; total: number }> {
  const payload = await apiClient.get<ArtifactListResponse>("/artifacts", {
    query: {
      workspace_id: input.workspaceId,
      chat_id: input.chatId,
      type: input.type ? toBackendArtifactType(input.type) : undefined,
      limit: input.limit,
      offset: input.offset,
    },
  });
  return {
    items: payload.items.map(adaptArtifact),
    total: payload.total,
  };
}

export async function getArtifact(artifactId: string): Promise<Artifact> {
  const payload = await apiClient.get<ArtifactRead>(`/artifacts/${artifactId}`);
  return adaptArtifact(payload);
}

export async function createArtifact(input: {
  workspaceId: string;
  chatId?: string | null;
  title: string;
  type: ArtifactType;
  content: string;
  language?: string;
}): Promise<Artifact> {
  const metadata: Record<string, unknown> | undefined = input.language
    ? { language: input.language }
    : undefined;

  const body: ArtifactCreateRequest = {
    workspace_id: input.workspaceId,
    chat_id: input.chatId ?? null,
    title: input.title,
    type: toBackendArtifactType(input.type),
    content: input.content,
    metadata_json: metadata ?? null,
  };
  const payload = await apiClient.post<ArtifactRead>("/artifacts", { json: body });
  return adaptArtifact(payload);
}

export async function updateArtifact(
  artifactId: string,
  input: {
    title?: string;
    content?: string;
    type?: ArtifactType;
    language?: string;
  }
): Promise<Artifact> {
  const metadata: Record<string, unknown> | undefined = input.language
    ? { language: input.language }
    : undefined;
  const body: ArtifactUpdateRequest = {
    title: input.title ?? null,
    content: input.content ?? null,
    type: input.type ? toBackendArtifactType(input.type) : null,
    metadata_json: metadata ?? null,
  };
  const payload = await apiClient.patch<ArtifactRead>(`/artifacts/${artifactId}`, { json: body });
  return adaptArtifact(payload);
}

export async function deleteArtifact(artifactId: string): Promise<void> {
  await apiClient.delete(`/artifacts/${artifactId}`);
}
