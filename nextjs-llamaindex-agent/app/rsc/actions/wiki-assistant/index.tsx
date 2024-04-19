import "server-only";

import config from "@/config/tools.json";
import { trimStartOfStreamHelper } from "ai";
import { getMutableAIState } from "ai/rsc";
import { MessageType, OpenAI, OpenAIAgent, ToolFactory } from "llamaindex";
import { nanoid } from "nanoid";
import { createAgentStreamableUI } from "../../helper";
import { type AI } from "../../index";
import { Message, StreamableUIHandler, UIStateItem } from "../../type";
import WikiSummaryCard from "./ui/wiki-card";

const llm = new OpenAI({ model: "gpt-4-turbo-preview" });

const wikiToolResponseHandler: StreamableUIHandler = async (
  uiStream,
  iterator,
  toolOutput,
) => {
  const trimStartOfStream = trimStartOfStreamHelper();
  const detailFromWiki = toolOutput!.content;
  let result = "";
  while (true) {
    const { value, done } = await iterator.next();
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
  return uiStream;
};

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

  // Create agent from tool configs, then chat to get a streamed response
  const tools = await ToolFactory.createTools(config);
  const agent = new OpenAIAgent({
    tools,
    llm,
  });
  const response = await agent.chat({
    message: userInput,
    chatHistory: aiState.get().messages.map((m) => ({
      role: m.role as MessageType,
      content: m.content,
    })),
    stream: true,
  });

  // create a UI stream from the agent streaming response
  const uiStream = createAgentStreamableUI({
    agentResponse: response,
    toolResponseHandler: wikiToolResponseHandler,
  });

  return {
    id: nanoid(),
    display: uiStream.value,
  };
}
