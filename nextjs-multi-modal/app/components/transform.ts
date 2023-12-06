import { MessageContentDetail, RawMessage, Message } from "./ui/chat/index";

const TEXT_CONTENT_TYPE = "text";

const parseMessageContentFromToken = (
  token: string
): MessageContentDetail | undefined => {
  try {
    const content = JSON.parse(token);
    if (typeof content === "string") {
      return {
        type: "text",
        text: content,
      };
    }
    return content;
  } catch (e) {
    console.warn("Failed to parse token", token);
  }
};

/**
 * Merges all the text content of the given content array into a single text content.
 * Non-text content is preserved in the resulting array.
 * @param content The array of content to merge.
 * @returns The merged content array.
 */
const mergeTextContent = (
  content: MessageContentDetail[]
): MessageContentDetail[] => {
  const nonTextContent = content.filter((c) => c.type !== TEXT_CONTENT_TYPE);
  const textContent = content
    .filter((c) => c.type === TEXT_CONTENT_TYPE)
    .map((c) => c.text)
    .join("");
  return [
    ...nonTextContent,
    {
      type: "text",
      text: textContent,
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

const transformMessage = (message: RawMessage): Message => {
  if (message.role !== "assistant") {
    // If the message is not from the assistant, return it as is
    return {
      ...message,
      content: [
        {
          type: "text",
          text: message.content,
        },
      ],
    };
  }
  // Split the message content into an array of data tokens
  const dataTokens = extractDataTokens(message.content);

  // Extract content from data tokens
  const content = dataTokens.flatMap((dataToken) => {
    const content = parseMessageContentFromToken(dataToken);
    return content ? [content] : [];
  });

  return {
    ...message,
    content: mergeTextContent(content),
  };
};

const moveUserContent = (messages: Message[]) => {
  messages.forEach((message, index) => {
    const prevMessage = messages[index - 1];
    if (
      message.role === "assistant" &&
      prevMessage &&
      prevMessage.role === "user"
    ) {
      const userContent = message.content.filter((c) => c.role === "user");

      // if the assistant message contains content for the user, move it to the previous user message
      userContent.forEach((mediaContent) => {
        prevMessage.content.push(mediaContent);
        // remove the media content from the assistant message
        message.content = message.content.filter((c) => c !== mediaContent);
      });
    }
  });
};

export const transformMessages = (messages: RawMessage[]) => {
  const result = messages.map((message) => transformMessage(message));
  moveUserContent(result);
  return result;
};
