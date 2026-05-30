"use client";

import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import { MainChatPanel } from "@/components/layout/MainChatPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import styles from "@/components/chat/chat-ui.module.css";

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 320;

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [resetSignal, setResetSignal] = useState(0);

  const startNewChat = useCallback(() => {
    setResetSignal((signal) => signal + 1);
    setDrawerOpen(false);
  }, []);

  const handleResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const initialWidth = sidebarWidth;

    const handleMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, initialWidth + moveEvent.clientX - startX));
      setSidebarWidth(nextWidth);
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }, [sidebarWidth]);

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
      />
      <button
        type="button"
        className={`${styles.backdrop} ${drawerOpen ? styles.backdropOpen : ""}`}
        aria-label="Close sidebar"
        onClick={() => setDrawerOpen(false)}
      />
      <MainChatPanel resetSignal={resetSignal} onOpenSidebar={() => setDrawerOpen(true)} />
    </div>
  );
}
