"use client";

import { useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainChatPanel } from "@/components/layout/MainChatPanel";

/**
 * AppShell — root layout container.
 *
 * ┌─────────────────┬───────────────────────────────────────────┐
 * │ Sidebar 224px   │  MainChatPanel (white rounded card)       │
 * │ bg: #f4f4f3     │  margin: 12px top / right / bottom        │
 * └─────────────────┴───────────────────────────────────────────┘
 *
 * App background: #f5f5f4 (warm off-white)
 */
export function AppShell() {
  // Use a ref callback to call reset on the panel from sidebar
  const resetRef = useRef<(() => void) | null>(null);

  const handleNewChat = () => {
    resetRef.current?.();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f5f4]">
      {/* ── Left sidebar ──────────────────────────────── */}
      <Sidebar onNewChat={handleNewChat} />

      {/* ── Main panel with spacing ───────────────────── */}
      {/* p-3 pl-0 → 12px gap on top, right, bottom; flush left against sidebar */}
      <div className="flex flex-1 min-w-0 p-3 pl-0">
        <MainChatPanel
          onExternalReset={() => {
            // This wires external "New Chat" trigger into the panel's reset
            resetRef.current?.();
          }}
          className="flex-1"
        />
      </div>
    </div>
  );
}
