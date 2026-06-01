import { ChatArea } from "@/components/chat/ChatArea";

interface EmptyChatStateProps {
  onSend: (message: string) => void;
  /** Plus / attachment button handler — opens the file upload UI. */
  onAttach?: () => void;
}

export function EmptyChatState({ onSend, onAttach }: EmptyChatStateProps) {
  return (
    <ChatArea
      messages={[]}
      isThinking={false}
      onSend={onSend}
      onAttach={onAttach}
      onOpenSidebar={() => undefined}
    />
  );
}
