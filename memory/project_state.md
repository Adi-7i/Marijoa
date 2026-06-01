---
name: project-state
description: Current MVP state, completed steps, architecture decisions for Marijoa frontend
metadata:
  type: project
---

Marijoa is a full-stack private AI workspace platform. Frontend is Next.js 15 App Router + TypeScript. Backend is FastAPI + PostgreSQL (not yet integrated).

**Current state (Frontend branch):**
Frontend architecture upgrade completed. App has full mock-data-driven UI for personal/org/workspace/chat navigation.

**Architecture decisions:**
- CSS Modules throughout — NO Tailwind utility classes in component JSX (Tailwind v4 configured but only via globals.css import)
- All state lives in `AppShell.tsx` — no Zustand/Redux, plain useState/useMemo
- Mock data in `src/lib/mock/mock-data.ts` with fixed `BASE_TS` timestamp to avoid hydration mismatches
- `useChat.ts` handles message streaming simulation; `resetTo()` loads messages from mock data when switching chats

**Key files:**
- `src/types/marijoa.ts` — domain types (User, Org, Workspace, Chat, Message, Artifact, FileItem)
- `src/lib/mock/mock-data.ts` — all mock data + `adaptMessageToChat()` adapter
- `src/components/layout/AppShell.tsx` — central state: mode, orgId, workspaceId, chatId, rightPanel
- `src/components/layout/Sidebar.tsx` — mode switcher + workspace selector + dynamic chat list
- `src/components/layout/RightPanel.tsx` — collapsible panel with Artifacts/Files/Context tabs
- `src/components/workspace/` — ModeSwitcher, WorkspaceSwitcher, WorkspaceBadge
- `src/components/artifacts/ArtifactPanel.tsx`, `src/components/files/FilePanel.tsx` — placeholders
- `src/components/admin/AdminPanelPlaceholder.tsx` — org-mode only admin placeholder

**What is NOT integrated yet (by design):**
- Real auth/login
- Backend API calls
- Real SSE streaming
- Real file upload
- Real artifact CRUD
- Real admin data
- Token handling

**Next step:** Backend API integration — replace mock data with real FastAPI endpoints via fetch/SSE.

**Why:** Established clean frontend architecture to allow backend integration without rewrites.
**How to apply:** When integrating APIs, swap mock data imports for API hooks/fetchers in AppShell. Keep component props interfaces stable.
