import { MODEL } from "@/constants";
import { Message, StreamingTextResponse } from "ai";
import { ImageNode, MessageContent, OpenAI, TextNode } from "llamaindex";
import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import { createRetriever } from "./engine";
import { LlamaIndexStream } from "./llamaindex-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages }: { messages: Message[] } = body;
    const lastMessage = messages.pop();
    if (!messages || !lastMessage || lastMessage.role !== "user") {
      return NextResponse.json(
        {
          error:
            "messages are required in the request body and the last message must be from the user",
        },
        { status: 400 }
      );
    }

    const llm = new OpenAI({
      model: MODEL,
      maxTokens: 512,
    });

    const query = lastMessage.content;

    const retriever = await createRetriever();
    const results = await retriever.retrieve(query);

    const context = results
      .flatMap((result) => {
        const node = result.node;
        if (node && node instanceof TextNode) {
          return [(node as TextNode).text];
        }
        return [];
      })
      .join("\n");

    const imageNode = results
      .filter((result) => result.node instanceof ImageNode)
      .flatMap((result) => (result.node ? [result.node] : []))
      .at(0);

    let imageUrl;
    if (imageNode) {
      imageUrl = path.join(__dirname, imageNode.id_);
      console.log(imageUrl);
    }

    const prompt = `Context information is below.
      ---------------------
      ${context}
      ---------------------
      Given the context information and not prior knowledge, 
      answer the query.
      Query: ${query}
      Answer: `;

    const response = await llm.chat(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      undefined,
      true
    );

    // Transform the response into a readable stream
    const stream = LlamaIndexStream(response, {
      parserOptions: {
        assistant_image_url:
          "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/football-match.jpg", // TODO add the retrieved image node
      },
    });

    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream.stream, {}, stream.data);
  } catch (error) {
    console.error("[LlamaIndex]", error);
    return NextResponse.json(
      {
        error: (error as Error).message,
      },
      {
        status: 500,
      }
    );
  }
}
