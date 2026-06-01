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
import { WorkspaceOverview } from "@/components/organization/WorkspaceOverview";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import {
  MOCK_ORGANIZATIONS,
  MOCK_WORKSPACES,
  MOCK_CHATS,
  MOCK_MESSAGES,
  MOCK_MEMBERS,
  MOCK_ARTIFACTS,
  MOCK_FILES,
  MOCK_USER,
  MOCK_WORKSPACE_CONTEXTS,
  MOCK_ADMIN_USAGE,
  MOCK_AUDIT_LOGS,
  adaptMessageToChat,
} from "@/lib/mock/mock-data";
import type { AppMode, Artifact, ArtifactType, RightPanelTab } from "@/types/marijoa";
import styles from "@/components/chat/chat-ui.module.css";

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 320;

// Fixed base timestamp for newly created artifact IDs (avoids hydration issues)
const BASE_TS = 1748736000000;

export function AppShell() {
  // Layout state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [resetSignal, setResetSignal] = useState(0);

  // App state
  const [mode, setMode] = useState<AppMode>("personal");
  const [selectedOrgId, setSelectedOrgId] = useState("org-personal");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    "ws-personal-default"
  );
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("artifacts");

  // Locally created artifacts (from Save as Artifact)
  const [localArtifacts, setLocalArtifacts] = useState<Artifact[]>([]);
  // Counter for stable IDs on saved artifacts
  const [artifactCounter, setArtifactCounter] = useState(0);

  // Derived data
  const currentOrg = useMemo(
    () => MOCK_ORGANIZATIONS.find((o) => o.id === selectedOrgId),
    [selectedOrgId]
  );

  const currentWorkspaces = useMemo(
    () => MOCK_WORKSPACES.filter((w) => w.organizationId === selectedOrgId),
    [selectedOrgId]
  );

  const currentWorkspace = useMemo(
    () => currentWorkspaces.find((w) => w.id === selectedWorkspaceId),
    [currentWorkspaces, selectedWorkspaceId]
  );

  const currentChats = useMemo(
    () =>
      selectedWorkspaceId
        ? MOCK_CHATS.filter((c) => c.workspaceId === selectedWorkspaceId)
        : MOCK_CHATS.filter((c) => c.organizationId === selectedOrgId),
    [selectedOrgId, selectedWorkspaceId]
  );

  const selectedChat = useMemo(
    () => currentChats.find((c) => c.id === selectedChatId),
    [currentChats, selectedChatId]
  );

  const initialMessages = useMemo(
    () =>
      selectedChatId
        ? MOCK_MESSAGES.filter((m) => m.chatId === selectedChatId).map(adaptMessageToChat)
        : [],
    [selectedChatId]
  );

  const currentArtifacts = useMemo(() => {
    if (!selectedWorkspaceId) return [];
    const mock = MOCK_ARTIFACTS.filter((a) => a.workspaceId === selectedWorkspaceId);
    const local = localArtifacts.filter((a) => a.workspaceId === selectedWorkspaceId);
    return [...mock, ...local];
  }, [selectedWorkspaceId, localArtifacts]);

  const currentFiles = useMemo(
    () =>
      selectedWorkspaceId
        ? MOCK_FILES.filter((f) => f.workspaceId === selectedWorkspaceId)
        : [],
    [selectedWorkspaceId]
  );

  const currentMembers = useMemo(
    () => MOCK_MEMBERS.filter((m) => m.organizationId === selectedOrgId),
    [selectedOrgId]
  );

  const currentContext = useMemo(
    () => MOCK_WORKSPACE_CONTEXTS.find((c) => c.workspaceId === selectedWorkspaceId),
    [selectedWorkspaceId]
  );

  // Content routing
  const showAdminDashboard = mode === "organization" && showAdmin && currentOrg?.type === "COMPANY";
  const showOrgOverview = mode === "organization" && !showAdminDashboard && !selectedWorkspaceId;
  const showWorkspaceOverview =
    mode === "organization" && !showAdminDashboard && !!selectedWorkspaceId && !selectedChatId;
  const showChat = !showAdminDashboard && !showOrgOverview && !showWorkspaceOverview;

  // Handlers
  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode);
    setSelectedChatId(null);
    setShowAdmin(false);
    setRightPanelOpen(false);
    setResetSignal((s) => s + 1);
    if (newMode === "personal") {
      setSelectedOrgId("org-personal");
      const ws = MOCK_WORKSPACES.find(
        (w) => w.organizationId === "org-personal" && w.isDefault
      );
      setSelectedWorkspaceId(ws?.id ?? null);
    } else {
      const companyOrg = MOCK_ORGANIZATIONS.find((o) => o.type === "COMPANY");
      if (companyOrg) {
        setSelectedOrgId(companyOrg.id);
        setSelectedWorkspaceId(null);
      }
    }
  }, []);

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

  const handleSaveAsArtifact = useCallback(
    (title: string, type: ArtifactType, content: string) => {
      if (!selectedWorkspaceId) return;
      setArtifactCounter((c) => {
        const newArtifact: Artifact = {
          id: `artifact-local-${BASE_TS}-${c}`,
          workspaceId: selectedWorkspaceId,
          chatId: selectedChatId ?? undefined,
          createdBy: MOCK_USER.id,
          title,
          type,
          content,
          version: 1,
          isActive: true,
          createdAt: BASE_TS,
          updatedAt: BASE_TS,
        };
        setLocalArtifacts((prev) => [...prev, newArtifact]);
        setRightPanelOpen(true);
        setRightPanelTab("artifacts");
        return c + 1;
      });
    },
    [selectedWorkspaceId, selectedChatId]
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
        startNewChat();
      }
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startNewChat]);

  return (
    <div className={styles.appShell}>
      <Sidebar
        onNewChat={startNewChat}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={sidebarWidth}
        onResizeStart={handleResizeStart}
        mode={mode}
        onModeChange={handleModeChange}
        organizations={MOCK_ORGANIZATIONS}
        selectedOrgId={selectedOrgId}
        workspaces={currentWorkspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        onWorkspaceChange={handleWorkspaceChange}
        onShowOrgOverview={handleShowOrgOverview}
        onShowAdmin={handleShowAdmin}
        isAdminActive={showAdminDashboard}
        chats={currentChats}
        selectedChatId={selectedChatId}
        onChatSelect={handleChatSelect}
        user={MOCK_USER}
      />

      <button
        type="button"
        className={`${styles.backdrop} ${drawerOpen ? styles.backdropOpen : ""}`}
        aria-label="Close sidebar"
        onClick={() => setDrawerOpen(false)}
      />

      {showAdminDashboard && currentOrg && (
        <AdminDashboard
          org={currentOrg}
          usage={MOCK_ADMIN_USAGE}
          members={currentMembers}
          auditLogs={MOCK_AUDIT_LOGS.filter((l) => l.organizationId === currentOrg.id)}
          currentUserRole={currentOrg.role}
        />
      )}

      {showOrgOverview && currentOrg && (
        <OrganizationOverview
          org={currentOrg}
          workspaces={currentWorkspaces}
          members={currentMembers}
          onSelectWorkspace={handleWorkspaceChange}
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
          initialMessages={initialMessages}
          chatTitle={selectedChat?.title}
          workspaceName={currentWorkspace?.name}
          orgName={currentOrg?.name}
          mode={mode}
          rightPanelOpen={rightPanelOpen}
          onToggleRightPanel={() => setRightPanelOpen((o) => !o)}
          onSaveAsArtifact={handleSaveAsArtifact}
        />
      )}

      {rightPanelOpen && showChat && (
        <RightPanel
          tab={rightPanelTab}
          onTabChange={setRightPanelTab}
          onClose={() => setRightPanelOpen(false)}
          artifacts={currentArtifacts}
          files={currentFiles}
          workspace={currentWorkspace}
          org={currentOrg}
          context={currentContext}
        />
      )}
    </div>
  );
}
