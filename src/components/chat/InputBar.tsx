"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { chatMessageSchema } from "@/lib/validation";
import { COMPOSER_MAX_LENGTH, COMPOSER_PLACEHOLDER } from "@/lib/constants";
import styles from "@/components/chat/chat-ui.module.css";
import { ArrowUpIcon, MicIcon } from "@/components/chat/icons";
import { ChatToolsMenu } from "@/components/chat/ChatToolsMenu";

interface InputBarProps {
  onSend?: (message: string) => void;
  /**
   * Open the file upload UI. Wired from MainChatPanel → AppShell so it
   * does not create a chat or submit the composer.
   */
  onAttach?: () => void;
  autoFocus?: boolean;
  className?: string;
  /** Web search toggle state (auto when true, off when false). */
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (next: boolean) => void;
}

export function InputBar({
  onSend,
  onAttach,
  autoFocus = false,
  className,
  webSearchEnabled,
  onWebSearchToggle,
}: InputBarProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeFrameRef = useRef<number | null>(null);

  const resizeTextarea = useCallback(() => {
    if (resizeFrameRef.current !== null) cancelAnimationFrame(resizeFrameRef.current);
    resizeFrameRef.current = requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "0px";
      el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
    });
  }, []);

  useEffect(() => {
    if (autoFocus) {
      const timer = window.setTimeout(() => textareaRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
  }, [autoFocus]);

  useEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

  useEffect(() => {
    return () => {
      if (resizeFrameRef.current !== null) cancelAnimationFrame(resizeFrameRef.current);
    };
  }, []);

  const submit = useCallback(() => {
    const result = chatMessageSchema.safeParse({ message: value });
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "Invalid message.");
      textareaRef.current?.focus();
      return;
    }

    setError(null);
    onSend?.(result.data.message);
    setValue("");
  }, [onSend, value]);

  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
    if (error) setError(null);
  }, [error]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }, [submit]);

  const hasText = value.trim().length > 0;
  const countRatio = Math.min(value.length / COMPOSER_MAX_LENGTH, 1);
  const nearLimit = countRatio >= 0.75;
  const arc = `${Math.round(countRatio * 360)}deg`;
  const arcColor = countRatio > 0.9 ? "#dc2626" : "#1a1a1a";

  const toolsVisible = webSearchEnabled !== undefined && onWebSearchToggle !== undefined;

  return (
    <div className={`${styles.inputRoot} ${className ?? ""}`}>
      <div className={styles.inputWrapper} role="group" aria-label="Chat message composer">
        {toolsVisible ? (
          <ChatToolsMenu
            webSearchEnabled={webSearchEnabled}
            onToggleWebSearch={onWebSearchToggle}
            onAttach={onAttach}
          />
        ) : (
          <button
            type="button"
            className={styles.attachButton}
            aria-label="Attach a file"
            aria-disabled={onAttach ? undefined : true}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAttach?.();
            }}
          >
            <PlusFallbackIcon />
          </button>
        )}

        <label htmlFor="chat-input" className="sr-only">
          Chat message
        </label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={COMPOSER_PLACEHOLDER}
          maxLength={COMPOSER_MAX_LENGTH}
          autoComplete="off"
          spellCheck
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "composer-error" : undefined}
          className={styles.textarea}
        />

        <button
          type="button"
          className={`${styles.micButton} ${isRecording ? styles.recording : ""}`}
          aria-label={isRecording ? "Stop voice input" : "Voice input"}
          onClick={() => setIsRecording((current) => !current)}
        >
          <MicIcon size={16} />
        </button>

        <span className={styles.sendWrap} aria-hidden="false">
          <span
            className={`${styles.progressArc} ${nearLimit ? styles.progressVisible : ""}`}
            style={{ "--arc": arc, "--arc-color": arcColor } as CSSProperties}
          />
          <button
            type="button"
            className={`${styles.sendButton} ${hasText ? styles.sendReady : ""}`}
            aria-label="Send message"
            aria-disabled={!hasText}
            onClick={submit}
          >
            <ArrowUpIcon size={15} />
          </button>
        </span>
      </div>
      {error && (
        <p id="composer-error" role="alert" className={styles.validation}>
          {error}
        </p>
      )}
    </div>
  );
}

function PlusFallbackIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
