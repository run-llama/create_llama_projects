import { AI } from "@/app/rsc";
import { UIStateItem } from "@/app/rsc/type";
import { useAIState, useActions, useUIState } from "ai/rsc";
import { nanoid } from "nanoid";
import { FormEvent, useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import ChatMessage from "./chat-message";

export default function ChatInput() {
  const [inputValue, setInputValue] = useState("");
  const [aiState] = useAIState();
  const [messages, setMessages] = useUIState<typeof AI>();
  const { submitUserMessage } = useActions();
  console.log({ aiState, messages });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue) return;

    // Add user message to UI state
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: nanoid(),
        display: <ChatMessage role="user" message={inputValue} />,
      },
    ]);

    // Submit and get response message
    const responseMessage: UIStateItem = await submitUserMessage(inputValue);
    setMessages((currentMessages) => [...currentMessages, responseMessage]);

    setInputValue("");
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl bg-white p-4 shadow-xl space-y-4"
    >
      <div className="flex w-full items-start justify-between gap-4 ">
        <Input
          autoFocus
          name="message"
          placeholder="Type a message"
          className="flex-1"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
        />
        <Button type="submit">Send message</Button>
      </div>
    </form>
  );
}
