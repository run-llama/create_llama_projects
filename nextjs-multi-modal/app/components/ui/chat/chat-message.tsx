/* eslint-disable @next/next/no-img-element */
import { Check, Copy } from "lucide-react";

import { Button } from "../button";
import ChatAvatar from "./chat-avatar";
import { Message, MessageContentDetail } from "./chat.interface";
import Markdown from "./markdown";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

function ChatMessageContents({
  contents,
}: {
  contents: MessageContentDetail[];
}) {
  const mediaContents = contents.filter(
    (c) => c.type === "image_url" && c.image_url?.url,
  );
  const textContent = contents.find((c) => c.type === "text");

  return (
    <>
      {mediaContents.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {mediaContents.map((content, index) => {
            const image_url = content.image_url?.url;
            return (
              <div key={index}>
                <img
                  src={image_url}
                  className="rounded-md max-w-[200px] shadow-md"
                  alt=""
                />
              </div>
            );
          })}
        </div>
      )}
      {textContent && <Markdown content={textContent.text!} />}
    </>
  );
}

export default function ChatMessage(chatMessage: Message) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 });
  const onCopy = () => {
    const pureText = chatMessage.content.find((c) => c.text)?.text;
    if (pureText) copyToClipboard(pureText);
  };
  return (
    <div className="flex items-start gap-4 pr-5 pt-5">
      <ChatAvatar role={chatMessage.role} />
      <div className="group flex flex-1 justify-between gap-2">
        <div className="flex-1 space-y-4">
          <ChatMessageContents contents={chatMessage.content} />
        </div>
        <Button
          onClick={onCopy}
          size="icon"
          variant="ghost"
          className="h-8 w-8 opacity-0 group-hover:opacity-100"
        >
          {isCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
