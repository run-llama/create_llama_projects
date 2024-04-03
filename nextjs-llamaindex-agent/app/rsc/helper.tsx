import ChatLoading from "@/app/components/ui/chat/chat-loading";
import { trimStartOfStreamHelper } from "ai";
import { createStreamableUI } from "ai/rsc";
import { StreamingAgentChatResponse, ToolOutput } from "llamaindex";
import { StreamableUIHandler } from "./type";
import WikiSummaryCard from "./actions/wiki-assistant/ui/wiki-card";

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
  const detailFromWiki = `
    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    Curabitur auctor, lacus et ultricies aliquam, justo tortor
    dignissim mi, et ultricies odio libero nec purus. Nulla
    facilisi. In hac habitasse platea dictumst. Sed id odio
    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    Curabitur auctor, lacus et ultricies aliquam, justo tortor
    dignissim mi, et ultricies odio libero nec purus. Nulla
    facilisi. In hac habitasse platea dictumst. Sed id odio
    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    Curabitur auctor, lacus et ultricies aliquam, justo tortor
    dignissim mi, et ultricies odio libero nec purus. Nulla
    facilisi. In hac habitasse platea dictumst. Sed id odio
    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    Curabitur auctor, lacus et ultricies aliquam, justo tortor
    dignissim mi, et ultricies odio libero nec purus. Nulla
    facilisi. In hac habitasse platea dictumst. Sed id odio
    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    Curabitur auctor, lacus et ultricies aliquam, justo tortor
    dignissim mi, et ultricies odio libero nec purus. Nulla
    facilisi. In hac habitasse platea dictumst. Sed id odio
    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    Curabitur auctor, lacus et ultricies aliquam, justo tortor
    dignissim mi, et ultricies odio libero nec purus. Nulla
    facilisi. In hac habitasse platea dictumst. Sed id odio
    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    Curabitur auctor, lacus et ultricies aliquam, justo tortor
    dignissim mi, et ultricies odio libero nec purus. Nulla
    facilisi. In hac habitasse platea dictumst. Sed id odio
  `
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
