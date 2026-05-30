import { ChatGreeting } from "@/components/chat/ChatGreeting";
import { ChatComposer } from "@/components/chat/ChatComposer";

interface EmptyChatStateProps {
  onSend: (message: string) => void;
  onReset?: () => void;
}

/**
 * Empty chat screen — shows greeting + centered composer.
 * Visible before any message has been sent.
 *
 * Layout: greeting and composer are stacked, centered vertically
 * at roughly 45% from the top of the panel (slightly above center).
 */
export function EmptyChatState({ onSend, onReset }: EmptyChatStateProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6">
      {/* Nudge slightly above true center */}
      <div
        className="flex flex-col items-center gap-8 w-full"
        style={{ marginTop: "-6%" }}
      >
        <ChatGreeting />
        <ChatComposer
          onSend={onSend}
          onReset={onReset}
          autoFocus
          className="w-full"
        />
      </div>
    </div>
  );
}
