import { JSONValue } from "ai";
import { MessageContentDetail, RawMessage, Message } from "./ui/chat/index";

const transformMessage = (
  message: RawMessage,
  data: JSONValue | undefined,
): Message => {
  const msg = {
    ...message,
    content: [
      {
        type: "text",
        text: message.content,
      },
    ],
  } as Message;
  if (data && typeof data === "object" && Object.keys(data).length > 0) {
    // if the server sends an non-empty data object, it must be of type MessageContentDetail
    // add it to the message's content
    const content = data as unknown as MessageContentDetail;
    if (content["type"] === "image_url") {
      msg.content.push(content);
    }
  }
  return msg;
};

export const transformMessages = (
  messages: RawMessage[],
  data: JSONValue[] | undefined,
) => {
  const result = messages.map((message, index) =>
    transformMessage(message, data?.at(index)),
  );
  return result;
};
