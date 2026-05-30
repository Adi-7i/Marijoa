import { ChatArea } from "@/components/chat/ChatArea";

interface EmptyChatStateProps {
  onSend: (message: string) => void;
  onReset?: () => void;
}

export function EmptyChatState({ onSend, onReset }: EmptyChatStateProps) {
  return (
    <ChatArea
      messages={[]}
      isThinking={false}
      onSend={onSend}
      onNewChat={onReset}
      onOpenSidebar={() => undefined}
    />
  );
}
