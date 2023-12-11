import {
  createCallbacksTransformer,
  createStreamDataTransformer,
  trimStartOfStreamHelper,
  type AIStreamCallbacksAndOptions,
  experimental_StreamData,
  JSONValue,
} from "ai";

type ParserOptions = {
  image_url?: string; // sends an image url for the user's message
  assistant_image_url?: string; // sends an image url for the assistant's message
};

function createParser(
  res: AsyncGenerator<any>,
  data: experimental_StreamData,
  opts?: ParserOptions
) {
  const trimStartOfStream = trimStartOfStreamHelper();
  return new ReadableStream<string>({
    start() {
      // if an user image is provided, send it via the data stream
      data.append(convertImageUrl(opts?.image_url));
    },
    async pull(controller): Promise<void> {
      const { value, done } = await res.next();
      if (done) {
        controller.close();
        // if an assistant image is provided, send it via the data stream
        data.append(convertImageUrl(opts?.assistant_image_url));
        data.close();
        return;
      }

      const text = trimStartOfStream(value ?? "");
      if (text) {
        controller.enqueue(text);
      }
    },
  });
}

function convertImageUrl(imageUrl: string | undefined): JSONValue {
  if (imageUrl) {
    return {
      type: "image_url",
      image_url: {
        url: imageUrl,
      },
    };
  } else {
    return {}; // always send an empty object - that way it's easy to map the data to the message (for each message there will be one data object)
  }
}

export function LlamaIndexStream(
  res: AsyncGenerator<any>,
  opts?: {
    callbacks?: AIStreamCallbacksAndOptions;
    parserOptions?: ParserOptions;
  }
): { stream: ReadableStream; data: experimental_StreamData } {
  const data = new experimental_StreamData();
  return {
    stream: createParser(res, data, opts?.parserOptions)
      .pipeThrough(createCallbacksTransformer(opts?.callbacks))
      .pipeThrough(createStreamDataTransformer(true)),
    data,
  };
}
