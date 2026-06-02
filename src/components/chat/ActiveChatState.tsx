import type { ChatMessage } from "@/types/chat";
import { ChatArea } from "@/components/chat/ChatArea";

interface ActiveChatStateProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  /** Plus / attachment button handler — opens the file upload UI. */
  onAttach?: () => void;
}

export function ActiveChatState({ messages, onSend, onAttach }: ActiveChatStateProps) {
  return (
    <ChatArea
      messages={messages}
      isThinking={messages.some((message) => message.isStreaming)}
      onSend={onSend}
      onAttach={onAttach}
      onOpenSidebar={() => undefined}
    />
  );
}
