import ChatLoading from "@/app/components/ui/chat/chat-loading";
import ChatMessage from "@/app/components/ui/chat/chat-message";
import { getMutableAIState, render } from "ai/rsc";
import { nanoid } from "nanoid";
import { OpenAI } from "openai";
import { z } from "zod";
import { type AI } from "../../index";
import { Message, UIStateItem } from "../../type";
import { PROMPT } from "./shared";
import FlightCard from "./ui/flight-card";
import { getFlightInfo } from "./tools";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askFlightInformation(
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

  // Creates a generated, streamable UI.
  const ui = render({
    model: "gpt-4-0125-preview",
    provider: openai,
    initial: <ChatLoading />,
    messages: [
      { role: "system", content: PROMPT },
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name,
      })),
    ],
    tools: {
      get_flight_info: {
        description: "Get the information for a flight",
        parameters: z
          .object({
            flightNumber: z.string().describe("the number of the flight"),
          })
          .required(),
        render: async function* ({ flightNumber }) {
          // Show a spinner on the client while we wait for the response.
          yield <ChatLoading />;

          // Fetch the flight information from an external API.
          const flightInfo = await getFlightInfo(flightNumber);

          // Update the final AI state.
          const toolResponseMessage: Message = {
            id: nanoid(),
            role: "function",
            name: "get_flight_info",
            content: JSON.stringify(flightInfo),
          };
          aiState.done({
            ...aiState.get(),
            messages: [...aiState.get().messages, toolResponseMessage],
          });

          // Return the flight card to the client.
          return <FlightCard flightInfo={flightInfo} />;
        },
      },
    },
    // In case, tools have not been used, fallback to response from the LLM.
    text: ({ content, done }) => {
      if (done) {
        const assistantResponseMessage: Message = {
          id: nanoid(),
          role: "assistant",
          content,
        };
        aiState.done({
          ...aiState.get(),
          messages: [...aiState.get().messages, assistantResponseMessage],
        });
      }
      return <ChatMessage role="assistant" message={content} />;
    },
  });

  return {
    id: nanoid(),
    display: ui,
  };
}
