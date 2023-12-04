import { nanoid } from "ai";
import { Message } from "ai/react";

const parseMessageFromToken = (tokenString: string): Message => {
  try {
    const token = JSON.parse(tokenString);
    if (typeof token === "string") {
      return {
        id: nanoid(),
        role: "assistant",
        content: token,
      };
    }

    const payload = token.payload;
    if (token.type === "function_call") {
      return {
        id: nanoid(),
        role: "function",
        function_call: {
          name: payload.tool_str,
          arguments: payload.arguments_str,
        },
        content: `Calling function: ${payload.tool_str} with args: ${payload.arguments_str}`,
      };
    }

    if (token.type === "function_call_response") {
      return {
        id: nanoid(),
        role: "function",
        content: `Got output: ${payload.response}`,
      };
    }

    return {
      id: nanoid(),
      role: "assistant",
      content: tokenString,
    };
  } catch (e) {
    return {
      id: nanoid(),
      role: "assistant",
      content: tokenString,
    };
  }
};

const mergeLastAssistantMessages = (messages: Message[]): Message[] => {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role !== "assistant") return messages;

  let mergedContent = "";
  let i = messages.length - 1;

  // merge content of last assistant messages
  for (; i >= 0; i--) {
    if (messages[i].role !== "assistant") {
      break;
    }
    mergedContent = messages[i].content + mergedContent;
  }

  return [
    ...messages.slice(0, i + 1),
    {
      id: nanoid(),
      role: "assistant",
      content: mergedContent,
    },
  ];
};

const extractDataTokens = (messageContent: string): string[] => {
  const regex = /data: (.+?)\n+/g;
  const matches = [];
  let match;
  while ((match = regex.exec(messageContent)) !== null) {
    matches.push(match[1]);
  }
  return matches;
};

const transformMessage = (message: Message): Message[] => {
  if (message.role !== "assistant") {
    // If the message is not from the assistant, return it as is
    return [message];
  }
  // Split the message content into an array of data tokens
  const dataTokens = extractDataTokens(message.content);

  // Extract messages from data tokens
  const messages = dataTokens.map((dataToken) =>
    parseMessageFromToken(dataToken)
  );

  // Merge last assistant messages to one
  return mergeLastAssistantMessages(messages);
};

export const transformMessages = (messages: Message[]) => {
  return messages.flatMap((message) => transformMessage(message));
};
