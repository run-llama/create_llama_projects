import ChatLoading from "@/app/components/ui/chat/chat-loading";
import ChatMessage from "@/app/components/ui/chat/chat-message";
import config from "@/config/tools.json";
import { trimStartOfStreamHelper } from "ai";
import { createStreamableUI, getMutableAIState } from "ai/rsc";
import { MessageType, OpenAI, OpenAIAgent, ToolFactory } from "llamaindex";
import { nanoid } from "nanoid";
import { type AI } from "../../index";
import { Message, UIStateItem } from "../../type";
import { MAX_TOKEN, runAsyncFnWithoutBlocking } from "./shared";
import WikiSummaryCard from "./ui/wiki-card";

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

  // Create agent from tool configs
  const tools = await ToolFactory.createTools(config);
  const agent = new OpenAIAgent({
    tools,
    verbose: true,
    llm,
  });

  // Calling LlamaIndex's agent to get a streamed response
  const response = await agent.chat({
    message: userInput,
    chatHistory: aiState.get().messages.map((m) => ({
      role: m.role as MessageType,
      content: m.content,
    })),
    stream: true,
  });

  // Update the UI stream with the response
  const it = response.response[Symbol.asyncIterator]();
  const sources = response.sources;
  const trimStartOfStream = trimStartOfStreamHelper();
  runAsyncFnWithoutBlocking(async () => {
    if (sources.length) {
      const toolOutput = sources[0];
      if (toolOutput.toolName === "wikipedia_tool") {
        const detailFromWiki = toolOutput.content;
        let result = "";
        while (true) {
          const { value, done } = await it.next();
          if (done) {
            uiStream.done(
              <WikiSummaryCard result={result} detail={detailFromWiki} />,
            );
            break;
          }
          const text = trimStartOfStream(value.response ?? "");
          if (text) {
            result += text;
            uiStream.update(
              <WikiSummaryCard result={result} detail={detailFromWiki} />,
            );
          }
        }
      }
    }

    // If there is no source, just display the response as a response message from the assistant
    let result = "";
    while (true) {
      const { value, done } = await it.next();
      if (done) {
        // TODO: when the stream is done, we can add a button to regenerate the response here
        uiStream.done(<ChatMessage role="assistant" message={result} />);
        break;
      }
      const text = trimStartOfStream(value.response ?? "");
      if (text) {
        result += text;
        // TODO: when generating response, we can add a button to stop the stream here
        uiStream.update(<ChatMessage role="assistant" message={result} />);
      }
    }
  });

  return {
    id: nanoid(),
    display: uiStream.value,
  };
}
