"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
} from "react";
import { Plus, Mic, ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/IconButton";
import { chatMessageSchema } from "@/lib/validation";
import { COMPOSER_PLACEHOLDER, COMPOSER_MAX_LENGTH } from "@/lib/constants";

interface ChatComposerProps {
  /** Called with trimmed, validated message text on submit */
  onSend?: (message: string) => void;
  /** Called when Plus button is clicked (new chat / reset) */
  onReset?: () => void;
  /** When true, composer is in "bottom bar" mode (active chat) */
  isBottomBar?: boolean;
  /** Auto-focus on mount (empty state) */
  autoFocus?: boolean;
  className?: string;
}

/**
 * Pill-shaped chat composer input bar.
 *
 * Two visual modes:
 *   - Default (centered on empty screen)
 *   - Bottom bar (pinned to bottom of main panel during active chat)
 *
 * Validation: Zod schema — trim, non-empty, max 4000 chars.
 * Security: no dangerouslySetInnerHTML, dev-only logging.
 */
export function ChatComposer({
  onSend,
  onReset,
  isBottomBar = false,
  autoFocus = false,
  className,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [autoFocus]);

  const handleSubmit = useCallback(() => {
    const result = chatMessageSchema.safeParse({ message: value });

    if (!result.success) {
      const msg = result.error.errors[0]?.message ?? "Invalid message.";
      setError(msg);
      inputRef.current?.focus();
      return;
    }

    setError(null);

    // Dev-only — never in production
    if (process.env.NODE_ENV === "development") {
      console.log("[ChatComposer] sent:", result.data.message);
    }

    onSend?.(result.data.message);
    setValue("");
  }, [value, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      if (error) setError(null);
    },
    [error]
  );

  const handlePlusClick = useCallback(() => {
    onReset?.();
    setValue("");
    setError(null);
    inputRef.current?.focus();
  }, [onReset]);

  const charCount = value.length;
  const nearLimit = charCount > COMPOSER_MAX_LENGTH * 0.9;
  const hasValue = charCount > 0;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5",
        isBottomBar ? "w-full" : "w-full",
        className
      )}
    >
      {/* ── Pill input bar ──────────────────────────────── */}
      <div
        role="group"
        aria-label="Chat message composer"
        className={cn(
          "w-full max-w-[720px] flex items-center gap-1.5 px-3",
          "h-[58px] rounded-full bg-white",
          "border transition-all duration-200",
          error
            ? "border-red-300/70 shadow-[0_0_0_3px_rgba(239,68,68,0.06),0_14px_40px_rgba(15,23,42,0.08)]"
            : "border-neutral-200/70 shadow-[0_14px_40px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)]"
        )}
      >
        {/* Plus — new chat / attach */}
        <IconButton
          aria-label="Add attachment or start new chat"
          onClick={handlePlusClick}
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-full",
            "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          )}
        >
          <Plus size={17} strokeWidth={2} />
        </IconButton>

        {/* Hidden label for accessibility */}
        <label htmlFor="chat-input" className="sr-only">
          Chat message
        </label>

        {/* Text input */}
        <input
          id="chat-input"
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={COMPOSER_PLACEHOLDER}
          maxLength={COMPOSER_MAX_LENGTH}
          autoComplete="off"
          autoCorrect="off"
          spellCheck
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "composer-error" : undefined}
          className={cn(
            "flex-1 min-w-0 bg-transparent border-none outline-none",
            "text-[14.5px] text-neutral-800 placeholder:text-neutral-400",
            "leading-none"
          )}
        />

        {/* Mic */}
        <IconButton
          aria-label="Voice input"
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-full",
            "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          )}
        >
          <Mic size={16} strokeWidth={2} />
        </IconButton>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSubmit}
          aria-label="Send message"
          disabled={!hasValue}
          className={cn(
            "flex-shrink-0 w-[38px] h-[38px] rounded-full",
            "flex items-center justify-center",
            "transition-all duration-200 focus-ring",
            "disabled:opacity-25 disabled:cursor-not-allowed",
            hasValue
              ? [
                  "bg-neutral-800 hover:bg-neutral-700",
                  "shadow-[0_2px_8px_rgba(15,23,42,0.18)]",
                ]
              : "bg-neutral-200/80"
          )}
        >
          <ArrowUp
            size={15}
            strokeWidth={2.5}
            className="text-white -translate-y-px"
          />
        </button>
      </div>

      {/* Validation error */}
      {error && (
        <p
          id="composer-error"
          role="alert"
          className="text-[11.5px] text-red-500 font-medium"
        >
          {error}
        </p>
      )}

      {/* Character count near limit */}
      {nearLimit && !error && (
        <p
          aria-live="polite"
          className={cn(
            "text-[11px] tabular-nums",
            charCount >= COMPOSER_MAX_LENGTH ? "text-red-400" : "text-neutral-400"
          )}
        >
          {charCount} / {COMPOSER_MAX_LENGTH}
        </p>
      )}
    </div>
  );
}
