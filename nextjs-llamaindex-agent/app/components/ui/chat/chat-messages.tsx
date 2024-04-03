import { AI } from "@/app/rsc";
import { useUIState } from "ai/rsc";
import { Fragment, useEffect, useRef } from "react";

export default function ChatMessages() {
  const [messages] = useUIState<typeof AI>();
  const scrollableChatContainerRef = useRef<HTMLDivElement>(null);
  const messageLength = messages.length;
  const lastMessage = messages[messageLength - 1];

  const scrollToBottom = () => {
    if (scrollableChatContainerRef.current) {
      scrollableChatContainerRef.current.scrollTop =
        scrollableChatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageLength, lastMessage]);

  return (
    <div className="w-full rounded-xl bg-white p-4 shadow-xl pb-0">
      <div
        className="flex h-[50vh] flex-col gap-5 divide-y overflow-y-auto pb-4"
        ref={scrollableChatContainerRef}
      >
        {messages.map((message) => (
          <Fragment key={message.id}>{message.display}</Fragment>
        ))}
      </div>
    </div>
  );
}
