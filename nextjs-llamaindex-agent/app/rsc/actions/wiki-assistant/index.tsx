import ChatLoading from "@/app/components/ui/chat/chat-loading";
import ChatMessage from "@/app/components/ui/chat/chat-message";
import { trimStartOfStreamHelper } from "ai";
import { createStreamableUI, getMutableAIState } from "ai/rsc";
import { MessageType, OpenAI } from "llamaindex";
import { nanoid } from "nanoid";
import { createChatEngine } from "../../engine/chat";
import { type AI } from "../../index";
import { Message, UIStateItem } from "../../type";
import { MAX_TOKEN, runAsyncFnWithoutBlocking } from "./shared";

const llm = new OpenAI({
  model: (process.env.MODEL as any) ?? "gpt-3.5-turbo",
  maxTokens: MAX_TOKEN,
});

export async function submitUserMessage(
  userInput: string,
): Promise<UIStateItem> {
  "use server";
  const aiState = getMutableAIState<typeof AI>();

  // Update the AI state with the new user message.
  const newUserMessage: Message = {
    id: nanoid(),
    role: "user",
    content: userInput,
  };
  aiState.update({
    ...aiState.get(),
    messages: [...aiState.get().messages, newUserMessage],
  });

  // Init the UI stream with a loading component
  const uiStream = createStreamableUI(<ChatLoading />);

  // Create a ChatEngine instance that use LlamaIndex's Tools
  const chatEngine = await createChatEngine(llm);

  // Calling LlamaIndex's ChatEngine to get a streamed response
  const response = await chatEngine.chat({
    message: userInput,
    chatHistory: aiState.get().messages.map((m) => ({
      role: m.role as MessageType,
      content: m.content,
    })),
    stream: true,
  });

  // Update the UI stream with the response
  const it = response.response[Symbol.asyncIterator]();
  const trimStartOfStream = trimStartOfStreamHelper();
  runAsyncFnWithoutBlocking(async () => {
    // TODO: if result come from a tool, it's not text plain and should be handled differently
    let result = "";
    while (true) {
      const { value, done } = await it.next();
      if (done) break;
      const text = trimStartOfStream(value.response ?? "");
      if (text) {
        result += text;
        uiStream.update(<ChatMessage role="assistant" message={result} />);
      }
    }
  });

  return {
    id: nanoid(),
    display: uiStream.value,
  };
}
