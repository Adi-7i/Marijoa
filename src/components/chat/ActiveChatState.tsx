import type { ChatMessage } from "@/types/chat";
import { ChatArea } from "@/components/chat/ChatArea";

interface ActiveChatStateProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  onReset?: () => void;
}

export function ActiveChatState({ messages, onSend, onReset }: ActiveChatStateProps) {
  return (
    <ChatArea
      messages={messages}
      isThinking={messages.some((message) => message.isStreaming)}
      onSend={onSend}
      onNewChat={onReset}
      onOpenSidebar={() => undefined}
    />
  );
}
