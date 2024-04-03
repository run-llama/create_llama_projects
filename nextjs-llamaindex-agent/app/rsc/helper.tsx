import ChatLoading from "@/app/components/ui/chat/chat-loading";
import ChatMessage from "@/app/components/ui/chat/chat-message";
import { trimStartOfStreamHelper } from "ai";
import { createStreamableUI } from "ai/rsc";
import { StreamingAgentChatResponse, ToolOutput } from "llamaindex";
import { StreamableUIHandler } from "./type";

export const runAsyncFnWithoutBlocking = (
  fn: (..._args: any) => Promise<any>,
) => {
  fn();
};

interface CreateStreamableUIOptions {
  agentResponse: StreamingAgentChatResponse;
  toolResponseHandler: StreamableUIHandler;
}

export const assistantResponseHandler: StreamableUIHandler = async (
  uiStream,
  iterator,
) => {
  const trimStartOfStream = trimStartOfStreamHelper();
  let result = "";
  while (true) {
    const { value, done } = await iterator.next();
    if (done) {
      uiStream.done(<ChatMessage role="assistant" message={result} />);
      break;
    }
    const text = trimStartOfStream(value.response ?? "");
    if (text) {
      result += text;
      uiStream.update(<ChatMessage role="assistant" message={result} />);
    }
  }
  return uiStream;
};

export const createAgentStreamableUI = ({
  agentResponse,
  toolResponseHandler,
}: CreateStreamableUIOptions) => {
  // Init the UI stream with a loading component
  const uiStream = createStreamableUI(<ChatLoading />);

  // Update the UI stream with the response
  const iterator = agentResponse.response[Symbol.asyncIterator]();
  const toolOutput: ToolOutput | undefined = agentResponse.sources[0];

  runAsyncFnWithoutBlocking(async () => {
    if (toolOutput) await toolResponseHandler(uiStream, iterator, toolOutput);
    else await assistantResponseHandler(uiStream, iterator);
  });

  return uiStream;
};
