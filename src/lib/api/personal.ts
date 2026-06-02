"use client";

import { apiClient } from "./client";
import { adaptPersonalOrganization, adaptPersonalWorkspace, adaptAuthUser } from "./adapters";
import type { PersonalContextResponse, AuthUserResponse } from "./types";
import type { Organization, User, Workspace } from "@/types/marijoa";

export interface PersonalContext {
  user: User;
  personalOrganization: Organization;
  personalWorkspace: Workspace;
}

export async function fetchPersonalContext(): Promise<PersonalContext> {
  const payload = await apiClient.get<PersonalContextResponse>("/me/personal-context");
  return {
    user: adaptAuthUser(payload.user as unknown as AuthUserResponse),
    personalOrganization: adaptPersonalOrganization(payload.personal_organization),
    personalWorkspace: adaptPersonalWorkspace(payload.personal_workspace),
  };
}
