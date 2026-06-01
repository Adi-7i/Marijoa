"use client";

import { InputBar } from "@/components/chat/InputBar";

interface ChatComposerProps {
  onSend?: (message: string) => void;
  /**
   * Plus / attachment button handler. Opens the file upload UI.
   * Intentionally NOT wired to any "reset chat" or "new chat" action — the
   * composer's plus button must never reset workspace/chat state.
   */
  onAttach?: () => void;
  isBottomBar?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function ChatComposer({ onSend, onAttach, autoFocus = false, className }: ChatComposerProps) {
  return (
    <InputBar
      onSend={onSend}
      onAttach={onAttach}
      autoFocus={autoFocus}
      className={className}
    />
  );
}
