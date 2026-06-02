"use client";

import { apiClient } from "./client";
import { adaptFile } from "./adapters";
import type { FileDownloadUrlResponse, FileListResponse, FileRead } from "./types";
import type { FileItem, FileStatus } from "@/types/marijoa";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB — must match backend MAX_UPLOAD_SIZE_MB.

export interface FileSizeValidationResult {
  ok: boolean;
  message?: string;
}

export function validateFileSize(file: File, maxBytes: number = MAX_UPLOAD_BYTES): FileSizeValidationResult {
  if (file.size <= 0) {
    return { ok: false, message: "File appears to be empty." };
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `File is too large (max ${Math.round(maxBytes / (1024 * 1024))} MB).`,
    };
  }
  return { ok: true };
}

export async function listFiles(input: {
  workspaceId: string;
  status?: FileStatus;
  mimeType?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: FileItem[]; total: number }> {
  const payload = await apiClient.get<FileListResponse>("/files", {
    query: {
      workspace_id: input.workspaceId,
      status: input.status,
      mime_type: input.mimeType,
      limit: input.limit,
      offset: input.offset,
    },
  });
  return {
    items: payload.items.map(adaptFile),
    total: payload.total,
  };
}

export async function uploadFile(input: { workspaceId: string; file: File }): Promise<FileItem> {
  const validation = validateFileSize(input.file);
  if (!validation.ok) {
    throw new Error(validation.message ?? "Invalid file.");
  }
  const formData = new FormData();
  formData.append("workspace_id", input.workspaceId);
  formData.append("file", input.file);
  const payload = await apiClient.post<FileRead>("/files/upload", { body: formData });
  return adaptFile(payload);
}

export async function getFile(fileId: string): Promise<FileItem> {
  const payload = await apiClient.get<FileRead>(`/files/${fileId}`);
  return adaptFile(payload);
}

export async function deleteFile(fileId: string): Promise<void> {
  await apiClient.delete(`/files/${fileId}`);
}

export async function getDownloadUrl(fileId: string): Promise<FileDownloadUrlResponse> {
  return apiClient.post<FileDownloadUrlResponse>(`/files/${fileId}/download-url`);
}
