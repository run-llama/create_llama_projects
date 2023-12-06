import {
  createCallbacksTransformer,
  createStreamDataTransformer,
  trimStartOfStreamHelper,
  type AIStreamCallbacksAndOptions,
} from "ai";
import { MessageContentDetail } from "llamaindex";

type ParserOptions = {
  image_url?: string;
};

type MessageContentDetailWithRole = MessageContentDetail & {
  role: "user" | "assistant";
};

function createParser(res: AsyncGenerator<any>, opts?: ParserOptions) {
  const trimStartOfStream = trimStartOfStreamHelper();
  let firstToken = true;
  return new ReadableStream<string>({
    async pull(controller): Promise<void> {
      const { value, done } = await res.next();
      if (done) {
        controller.close();
        return;
      }

      if (firstToken) {
        // if image_url is provided, send it as MessageContentDetail with the first token
        if (opts?.image_url) {
          const message: MessageContentDetailWithRole = {
            role: "user", // set to "assistant" or leave blank to assign the content to the assistant
            type: "image_url",
            image_url: {
              url: opts.image_url,
            },
          };
          controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
        }
        firstToken = false;
      }

      const text = trimStartOfStream(value ?? "");
      if (text) {
        controller.enqueue(`data: ${JSON.stringify(text)}\n\n`);
      }
    },
  });
}

export function LlamaIndexStream(
  res: AsyncGenerator<any>,
  opts?: {
    callbacks?: AIStreamCallbacksAndOptions;
    parserOptions?: ParserOptions;
  }
): ReadableStream {
  return createParser(res, opts?.parserOptions)
    .pipeThrough(createCallbacksTransformer(opts?.callbacks))
    .pipeThrough(
      createStreamDataTransformer(opts?.callbacks?.experimental_streamData)
    );
}
