import ChatAvatar from "./chat-avatar";
import Markdown from "./markdown";

export default function ChatMessage({
  message,
  role,
}: {
  message: string;
  role: "user" | "function" | "assistant";
}) {
  return (
    <div className="flex items-start gap-4 pr-5 pt-5">
      <ChatAvatar role={role} />
      <div className="group flex flex-1 justify-between gap-2">
        <div className="flex-1 space-y-4">
          <Markdown content={message} />
        </div>
      </div>
    </div>
  );
}
