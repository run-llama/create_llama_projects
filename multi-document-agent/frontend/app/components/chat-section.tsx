"use client";

import { Message, useChat } from "ai/react";
import { ChatInput, ChatMessages } from "./ui/chat";
import { useMemo } from "react";
import { transformMessages } from "./transform";

export default function ChatSection() {
  const {
    messages,
    input,
    isLoading,
    handleSubmit,
    handleInputChange,
    reload,
    stop,
  } = useChat({
    api: process.env.NEXT_PUBLIC_CHAT_API,
  });

  const mergeFunctionMessages = (messages: Message[]): Message[] => {
    // only allow the last function message to be shown
    return messages.filter(
      (msg, i) => msg.role !== "function" || i === messages.length - 1
    );
  };

  const transformedMessages = useMemo(() => {
    return mergeFunctionMessages(transformMessages(messages));
  }, [messages]);

  return (
    <div className="space-y-4 max-w-5xl w-full">
      <ChatMessages
        messages={transformedMessages}
        isLoading={isLoading}
        reload={reload}
        stop={stop}
      />
      <ChatInput
        input={input}
        handleSubmit={handleSubmit}
        handleInputChange={handleInputChange}
        isLoading={isLoading}
      />
    </div>
  );
}
