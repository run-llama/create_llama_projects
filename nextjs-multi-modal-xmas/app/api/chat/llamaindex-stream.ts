import {
    createCallbacksTransformer,
    createStreamDataTransformer,
    trimStartOfStreamHelper,
    type AIStreamCallbacksAndOptions,
    experimental_StreamData,
    JSONValue,
} from "ai";
import OpenAI from 'openai';

type ParserOptions = {
    image_url?: string;
};

function wrapUrl(image_url: string | undefined): JSONValue {
    if (image_url) {
        // if image_url is provided, send it via the data stream
        return {
            type: "image_url",
            image_url: {
                url: image_url,
            },
        }
    }
    return {}; // send an empty image response for the user's message
}

function createParser(
    res: AsyncGenerator<any>,
    data: experimental_StreamData,
    opts?: ParserOptions,
) {
    const openai = new OpenAI();
    const trimStartOfStream = trimStartOfStreamHelper();
    let prompt = "";
    return new ReadableStream<string>({
            start() {
                data.append(wrapUrl(opts?.image_url));
            },
            async pull(controller): Promise<void> {
                const {value, done} = await res.next();
                if (done) {
                    const response = await openai.images.generate({
                        model: "dall-e-3",
                        prompt,
                        n: 1,
                        size: "1024x1024",
                    });
                    const imageUrl = response.data.at(0)?.url;
                    controller.close();
                    data.append(wrapUrl(imageUrl)); // send an empty image response for the assistant's message
                    await data.close();
                    return;
                }

                const text = trimStartOfStream(value ?? "");
                if (text) {
                    prompt = prompt + text;
                    controller.enqueue(text);
                }
            },
        }
    )
        ;
}

export function LlamaIndexStream(
    res: AsyncGenerator<any>,
    opts?: {
        callbacks?: AIStreamCallbacksAndOptions;
        parserOptions?: ParserOptions;
    },
): { stream: ReadableStream; data: experimental_StreamData } {
    const data = new experimental_StreamData();
    return {
        stream: createParser(res, data, opts?.parserOptions)
            .pipeThrough(createCallbacksTransformer(opts?.callbacks))
            .pipeThrough(createStreamDataTransformer(true)),
        data,
    };
}
