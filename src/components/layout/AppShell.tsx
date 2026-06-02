"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MainChatPanel } from "@/components/layout/MainChatPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";
import { OrganizationOverview } from "@/components/organization/OrganizationOverview";
import { OrganizationEmptyState } from "@/components/organization/OrganizationEmptyState";
import { CreateOrganizationModal } from "@/components/organization/CreateOrganizationModal";
import { AddWorkspaceModal } from "@/components/organization/AddWorkspaceModal";
import { InviteMemberModal } from "@/components/organization/InviteMemberModal";
import { WorkspaceOverview } from "@/components/organization/WorkspaceOverview";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Spinner } from "@/components/ui/Spinner";
import { Notice } from "@/components/ui/Notice";
import { useAuth } from "@/lib/auth/auth-context";
import { usePersonalContext } from "@/hooks/usePersonalContext";
import { useMyOrganizations } from "@/hooks/useOrganizations";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useChats } from "@/hooks/useChats";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useFiles } from "@/hooks/useFiles";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { createArtifact, deleteArtifact as apiDeleteArtifact } from "@/lib/api/artifacts";
import { deleteFile as apiDeleteFile, uploadFile as apiUploadFile } from "@/lib/api/files";
import { showToast } from "@/lib/toast";
import { ApiError } from "@/lib/api/errors";
import { buildWorkspaceContext } from "@/lib/api/adapters";
import type {
  ArtifactType,
  AppMode,
  Chat,
  Organization,
  Workspace,
  RightPanelTab,
} from "@/types/marijoa";
import styles from "@/components/chat/chat-ui.module.css";

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 320;

function selectInitialOrg(
  orgs: Organization[],
  personalOrgId: string,
  desiredMode: AppMode
): { mode: AppMode; orgId: string | null } {
  if (desiredMode === "personal") return { mode: "personal", orgId: personalOrgId };
  const company = orgs.find((o) => o.type === "COMPANY");
  if (company) return { mode: "organization", orgId: company.id };
  // No company org yet — keep the user in organization mode so the empty
  // "Create organization" state can render. Returning to personal silently
  // (the old behaviour) made the Org button look broken.
  return { mode: "organization", orgId: null };
}

export function AppShell() {
  const { user } = useAuth();

  // ---- Personal context bootstrap ----
  const personal = usePersonalContext(true);
  const organizationsRes = useMyOrganizations(personal.status === "success");

  const personalOrg = personal.data?.personalOrganization ?? null;
  const personalWorkspace = personal.data?.personalWorkspace ?? null;

  // ---- Layout state ----
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [resetSignal, setResetSignal] = useState(0);

  // ---- App selection state ----
  const [mode, setMode] = useState<AppMode>("personal");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("artifacts");
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showAddWorkspace, setShowAddWorkspace] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);

  // ---- Once personal context is ready, bootstrap default selection ----
  // Only runs once at the start (mode is "personal" by default). After the
  // user has explicitly switched modes, do NOT re-bootstrap into the personal
  // org — otherwise clicking "Org" with no company organisation would
  // immediately revert to personal (Bug 2).
  useEffect(() => {
    if (!personalOrg || !personalWorkspace || selectedOrgId) return;
    if (mode !== "personal") return;
    setSelectedOrgId(personalOrg.id);
    setSelectedWorkspaceId(personalWorkspace.id);
  }, [personalOrg, personalWorkspace, selectedOrgId, mode]);

  // Build the organization list: personal first, then company orgs from /organizations/me
  // (filtered to avoid duplicates with the personal org).
  const organizations: Organization[] = useMemo(() => {
    const result: Organization[] = [];
    if (personalOrg) result.push(personalOrg);
    for (const org of organizationsRes.data ?? []) {
      if (org.id === personalOrg?.id) continue;
      result.push(org);
    }
    return result;
  }, [organizationsRes.data, personalOrg]);

  const currentOrg = useMemo(
    () => organizations.find((o) => o.id === selectedOrgId) ?? null,
    [organizations, selectedOrgId]
  );

  // ---- Workspace list (personal mode uses personal workspace; org mode fetches) ----
  const isCompanyOrg = currentOrg?.type === "COMPANY";
  const workspacesRes = useWorkspaces(
    isCompanyOrg ? selectedOrgId : null,
    Boolean(isCompanyOrg && selectedOrgId)
  );

  const currentWorkspaces: Workspace[] = useMemo(() => {
    if (!currentOrg) return [];
    if (currentOrg.type === "PERSONAL") {
      return personalWorkspace ? [personalWorkspace] : [];
    }
    return workspacesRes.data ?? [];
  }, [currentOrg, personalWorkspace, workspacesRes.data]);

  const currentWorkspace = useMemo(
    () => currentWorkspaces.find((w) => w.id === selectedWorkspaceId) ?? null,
    [currentWorkspaces, selectedWorkspaceId]
  );

  // ---- Chats ----
  const chatsRes = useChats({
    workspaceId: selectedWorkspaceId,
    organizationId: selectedOrgId ?? undefined,
    enabled: Boolean(selectedWorkspaceId),
  });

  const currentChats = useMemo(() => chatsRes.data ?? [], [chatsRes.data]);
  const selectedChat = useMemo(
    () => currentChats.find((c) => c.id === selectedChatId) ?? null,
    [currentChats, selectedChatId]
  );

  // ---- Artifacts / Files (loaded for the right panel) ----
  const artifactsRes = useArtifacts(selectedWorkspaceId, Boolean(selectedWorkspaceId));
  const filesRes = useFiles(selectedWorkspaceId, Boolean(selectedWorkspaceId));
  const currentArtifacts = artifactsRes.data ?? [];
  const currentFiles = filesRes.data ?? [];

  // ---- Members (org mode only) ----
  const membersRes = useOrganizationMembers(
    isCompanyOrg ? selectedOrgId : null,
    Boolean(isCompanyOrg && selectedOrgId)
  );
  const currentMembers = membersRes.data ?? [];

  // Derived workspace context for the right-panel "Context" tab.
  const currentContext = useMemo(() => {
    if (!currentWorkspace) return undefined;
    return buildWorkspaceContext(currentWorkspace.id, currentWorkspace.name, {
      chats: currentChats.length,
      files: currentFiles.length,
      artifacts: currentArtifacts.length,
      members: currentMembers.length,
    });
  }, [
    currentWorkspace,
    currentChats.length,
    currentFiles.length,
    currentArtifacts.length,
    currentMembers.length,
  ]);

  // ---- Content routing ----
  const showAdminDashboard =
    mode === "organization" && showAdmin && currentOrg?.type === "COMPANY";
  // Empty state when the user has no company organization yet — clicking the
  // Org button lands them here with a "Create organization" CTA.
  const showOrgEmptyState =
    mode === "organization" && !showAdminDashboard && !currentOrg;
  const showOrgOverview =
    mode === "organization" &&
    !showAdminDashboard &&
    !showOrgEmptyState &&
    !selectedWorkspaceId;
  const showWorkspaceOverview =
    mode === "organization" &&
    !showAdminDashboard &&
    !showOrgEmptyState &&
    Boolean(selectedWorkspaceId) &&
    !selectedChatId;
  const showChat =
    !showAdminDashboard &&
    !showOrgEmptyState &&
    !showOrgOverview &&
    !showWorkspaceOverview;

  // ---- Handlers ----
  const handleModeChange = useCallback(
    (newMode: AppMode) => {
      if (!personalOrg || !personalWorkspace) return;
      const { mode: nextMode, orgId } = selectInitialOrg(organizations, personalOrg.id, newMode);
      setMode(nextMode);
      setSelectedOrgId(orgId);
      setSelectedChatId(null);
      setShowAdmin(false);
      setRightPanelOpen(false);
      setResetSignal((s) => s + 1);
      if (nextMode === "personal") {
        setSelectedWorkspaceId(personalWorkspace.id);
      } else {
        // Organization mode: clear the workspace selection. If the user has
        // no company org we render the create-org empty state instead.
        setSelectedWorkspaceId(null);
      }
    },
    [organizations, personalOrg, personalWorkspace]
  );

  const handleOpenCreateOrg = useCallback(() => {
    setShowCreateOrg(true);
  }, []);

  const handleCloseCreateOrg = useCallback(() => {
    setShowCreateOrg(false);
  }, []);

  const handleOrgCreated = useCallback(
    async (org: Organization) => {
      setShowCreateOrg(false);
      // Refresh org list so the new org appears in the sidebar selector.
      await organizationsRes.refresh();
      setMode("organization");
      setSelectedOrgId(org.id);
      setSelectedWorkspaceId(null);
      setSelectedChatId(null);
      setShowAdmin(false);
      setResetSignal((s) => s + 1);
      showToast(`Organization "${org.name}" created.`, { variant: "success" });
    },
    [organizationsRes]
  );

  const handleOpenFilesTab = useCallback(() => {
    setRightPanelOpen(true);
    setRightPanelTab("files");
  }, []);

  const handleOpenAddWorkspace = useCallback(() => {
    if (!currentOrg || currentOrg.type !== "COMPANY") return;
    setShowAddWorkspace(true);
  }, [currentOrg]);

  const handleCloseAddWorkspace = useCallback(() => {
    setShowAddWorkspace(false);
  }, []);

  const handleWorkspaceCreated = useCallback(
    async (workspace: Workspace) => {
      setShowAddWorkspace(false);
      await workspacesRes.refresh();
      setSelectedWorkspaceId(workspace.id);
      setSelectedChatId(null);
      setResetSignal((s) => s + 1);
      showToast(`Workspace "${workspace.name}" created.`, { variant: "success" });
    },
    [workspacesRes]
  );

  const handleOpenInviteMember = useCallback(() => {
    if (!currentOrg || currentOrg.type !== "COMPANY") return;
    setShowInviteMember(true);
  }, [currentOrg]);

  const handleCloseInviteMember = useCallback(() => {
    setShowInviteMember(false);
  }, []);

  const handleMemberInvited = useCallback(() => {
    // No active membership is created here — just refresh members so the
    // count is accurate after admin approval is granted later.
    void membersRes.refresh();
  }, [membersRes]);

  const handleWorkspaceChange = useCallback((workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    setSelectedChatId(null);
    setShowAdmin(false);
    setResetSignal((s) => s + 1);
  }, []);

  const handleShowOrgOverview = useCallback(() => {
    setSelectedWorkspaceId(null);
    setSelectedChatId(null);
    setShowAdmin(false);
    setRightPanelOpen(false);
    setResetSignal((s) => s + 1);
  }, []);

  const handleShowAdmin = useCallback(() => {
    setShowAdmin(true);
    setSelectedChatId(null);
    setRightPanelOpen(false);
    setDrawerOpen(false);
  }, []);

  const handleChatSelect = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
    setShowAdmin(false);
    setDrawerOpen(false);
  }, []);

  const startNewChat = useCallback(() => {
    setResetSignal((s) => s + 1);
    setSelectedChatId(null);
    setShowAdmin(false);
    setDrawerOpen(false);
  }, []);

  // Promote a freshly-created chat into the sidebar list and select it.
  // Called from MainChatPanel after the first message creates a chat on demand.
  const handleChatCreated = useCallback(
    (chat: Chat) => {
      chatsRes.setData([chat, ...(chatsRes.data ?? [])]);
      setSelectedChatId(chat.id);
    },
    [chatsRes]
  );

  // Refresh chat list after a streamed response finishes — so titles, message
  // counts, and last_message_at update without a full page reload.
  const handleChatActivity = useCallback(() => {
    void chatsRes.refresh();
  }, [chatsRes]);

  const handleSaveAsArtifact = useCallback(
    async (title: string, type: ArtifactType, content: string) => {
      if (!selectedWorkspaceId) {
        showToast("Open a workspace before saving artifacts.", { variant: "error" });
        return;
      }
      try {
        const artifact = await createArtifact({
          workspaceId: selectedWorkspaceId,
          chatId: selectedChatId ?? null,
          title,
          type,
          content,
        });
        artifactsRes.setData([artifact, ...(artifactsRes.data ?? [])]);
        setRightPanelOpen(true);
        setRightPanelTab("artifacts");
        showToast(`Saved "${artifact.title}" to artifacts.`, { variant: "success" });
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not save artifact.";
        showToast(message, { variant: "error" });
      }
    },
    [selectedWorkspaceId, selectedChatId, artifactsRes]
  );

  const handleDeleteArtifact = useCallback(
    async (artifactId: string) => {
      try {
        await apiDeleteArtifact(artifactId);
        artifactsRes.setData((artifactsRes.data ?? []).filter((a) => a.id !== artifactId));
        showToast("Artifact deleted.", { variant: "success" });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Could not delete artifact.";
        showToast(message, { variant: "error" });
      }
    },
    [artifactsRes]
  );

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (!selectedWorkspaceId) {
        showToast("Open a workspace to upload files.", { variant: "error" });
        return;
      }
      try {
        const uploaded = await apiUploadFile({ workspaceId: selectedWorkspaceId, file });
        filesRes.setData([uploaded, ...(filesRes.data ?? [])]);
        showToast(`Uploaded "${uploaded.name}".`, { variant: "success" });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Upload failed.";
        showToast(message, { variant: "error" });
      }
    },
    [selectedWorkspaceId, filesRes]
  );

  const handleDeleteFile = useCallback(
    async (fileId: string) => {
      try {
        await apiDeleteFile(fileId);
        filesRes.setData((filesRes.data ?? []).filter((f) => f.id !== fileId));
        showToast("File deleted.", { variant: "success" });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Could not delete file.";
        showToast(message, { variant: "error" });
      }
    },
    [filesRes]
  );

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const initialWidth = sidebarWidth;
      const handleMove = (moveEvent: PointerEvent) => {
        const next = Math.min(
          MAX_SIDEBAR_WIDTH,
          Math.max(MIN_SIDEBAR_WIDTH, initialWidth + moveEvent.clientX - startX)
        );
        setSidebarWidth(next);
      };
      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [sidebarWidth]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        if (selectedWorkspaceId) startNewChat();
      }
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startNewChat, selectedWorkspaceId]);

  // ---- Loading / error states for bootstrap ----
  if (personal.isLoading || (personal.status === "idle" && !personal.data)) {
    return (
      <div className={styles.appShell} aria-busy="true">
        <BootstrapScreen label="Loading your workspace…" />
      </div>
    );
  }
  if (personal.isError || !personalOrg || !personalWorkspace) {
    return (
      <div className={styles.appShell}>
        <BootstrapScreen
          label="We could not load your personal workspace."
          errorMessage={personal.error}
          onRetry={() => void personal.refresh()}
        />
      </div>
    );
  }

  const currentUserRole = currentOrg?.role ?? "MEMBER";

  return (
    <div className={styles.appShell}>
      <Sidebar
        onNewChat={startNewChat}
        canStartNewChat={Boolean(selectedWorkspaceId)}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={sidebarWidth}
        onResizeStart={handleResizeStart}
        mode={mode}
        onModeChange={handleModeChange}
        organizations={organizations}
        selectedOrgId={selectedOrgId ?? undefined}
        workspaces={currentWorkspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        onWorkspaceChange={handleWorkspaceChange}
        onShowOrgOverview={handleShowOrgOverview}
        onShowAdmin={handleShowAdmin}
        isAdminActive={showAdminDashboard}
        chats={currentChats}
        selectedChatId={selectedChatId}
        onChatSelect={handleChatSelect}
        user={user ?? undefined}
      />

      <button
        type="button"
        className={`${styles.backdrop} ${drawerOpen ? styles.backdropOpen : ""}`}
        aria-label="Close sidebar"
        onClick={() => setDrawerOpen(false)}
      />

      {showAdminDashboard && currentOrg && (
        <AdminDashboard
          organizationId={currentOrg.id}
          org={currentOrg}
          currentUserRole={currentUserRole}
          onMembersChanged={() => void membersRes.refresh()}
        />
      )}

      {showOrgEmptyState && (
        <OrganizationEmptyState
          onCreate={handleOpenCreateOrg}
          loading={organizationsRes.isLoading}
          errorMessage={organizationsRes.isError ? organizationsRes.error : null}
          onRetry={
            organizationsRes.isError
              ? () => void organizationsRes.refresh()
              : undefined
          }
        />
      )}

      {showOrgOverview && currentOrg && (
        <OrganizationOverview
          org={currentOrg}
          workspaces={currentWorkspaces}
          members={currentMembers}
          onSelectWorkspace={handleWorkspaceChange}
          onAddWorkspace={
            currentOrg.type === "COMPANY" ? handleOpenAddWorkspace : undefined
          }
          onInviteMember={
            currentOrg.type === "COMPANY" ? handleOpenInviteMember : undefined
          }
        />
      )}

      {showWorkspaceOverview && currentWorkspace && currentOrg && (
        <WorkspaceOverview
          workspace={currentWorkspace}
          org={currentOrg}
          chats={currentChats}
          members={currentMembers}
          onSelectChat={handleChatSelect}
          onNewChat={startNewChat}
        />
      )}

      {showChat && (
        <MainChatPanel
          resetSignal={resetSignal}
          onOpenSidebar={() => setDrawerOpen(true)}
          selectedChatId={selectedChatId}
          workspaceId={selectedWorkspaceId}
          organizationId={selectedOrgId ?? undefined}
          chatTitle={selectedChat?.title}
          workspaceName={currentWorkspace?.name}
          orgName={currentOrg?.name}
          mode={mode}
          rightPanelOpen={rightPanelOpen}
          onToggleRightPanel={() => setRightPanelOpen((o) => !o)}
          onOpenFiles={handleOpenFilesTab}
          onSaveAsArtifact={handleSaveAsArtifact}
          onChatCreated={handleChatCreated}
          onChatActivity={handleChatActivity}
        />
      )}

      {showCreateOrg && (
        <CreateOrganizationModal
          onSuccess={handleOrgCreated}
          onCancel={handleCloseCreateOrg}
        />
      )}

      {showAddWorkspace && currentOrg && currentOrg.type === "COMPANY" && (
        <AddWorkspaceModal
          organizationId={currentOrg.id}
          onSuccess={handleWorkspaceCreated}
          onCancel={handleCloseAddWorkspace}
        />
      )}

      {showInviteMember && currentOrg && currentOrg.type === "COMPANY" && (
        <InviteMemberModal
          organizationId={currentOrg.id}
          onInvited={handleMemberInvited}
          onClose={handleCloseInviteMember}
        />
      )}

      {rightPanelOpen && showChat && (
        <RightPanel
          tab={rightPanelTab}
          onTabChange={setRightPanelTab}
          onClose={() => setRightPanelOpen(false)}
          artifacts={currentArtifacts}
          artifactsLoading={artifactsRes.isLoading}
          artifactsError={artifactsRes.error}
          files={currentFiles}
          filesLoading={filesRes.isLoading}
          filesError={filesRes.error}
          workspace={currentWorkspace ?? undefined}
          org={currentOrg ?? undefined}
          context={currentContext}
          canUpload={Boolean(selectedWorkspaceId)}
          onUploadFile={handleUploadFile}
          onDeleteFile={handleDeleteFile}
          onDeleteArtifact={handleDeleteArtifact}
        />
      )}
    </div>
  );
}

function BootstrapScreen({
  label,
  errorMessage,
  onRetry,
}: {
  label: string;
  errorMessage?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        padding: 24,
        gap: 12,
      }}
    >
      <Spinner aria-label={label} />
      <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>{label}</span>
      {errorMessage && (
        <div style={{ maxWidth: 460 }}>
          <Notice>
            <span role="alert">{errorMessage}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  marginLeft: 8,
                  background: "transparent",
                  border: 0,
                  color: "var(--color-text)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            )}
          </Notice>
        </div>
      )}
    </div>
  );
}
