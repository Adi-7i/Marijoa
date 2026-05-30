"use client";

import { InputBar } from "@/components/chat/InputBar";

interface ChatComposerProps {
  onSend?: (message: string) => void;
  onReset?: () => void;
  isBottomBar?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function ChatComposer({ onSend, onReset, autoFocus = false, className }: ChatComposerProps) {
  return (
    <InputBar
      onSend={onSend}
      onAttach={onReset}
      autoFocus={autoFocus}
      className={className}
    />
  );
}
