"use client";

import { ChatInput, ChatMessages } from "./ui/chat";

export default function ChatSection() {
  return (
    <div className="space-y-4 max-w-5xl w-full">
      <ChatMessages />
      <ChatInput />
    </div>
  );
}
