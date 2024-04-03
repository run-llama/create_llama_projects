import { createStreamableUI } from "ai/rsc";
import { Response, ToolOutput } from "llamaindex";

export type Message = {
  role: "user" | "assistant" | "system" | "function" | "data" | "tool";
  content: string;
  id: string;
  name?: string;
};

export type AIState = {
  chatId: string;
  messages: Message[];
};

export type UIStateItem = {
  id: string;
  display: React.ReactNode;
};

export type UIState = UIStateItem[];

export type UIStream = ReturnType<typeof createStreamableUI>;

export type StreamableUIHandler = (
  _uiStream: UIStream,
  _iterator: AsyncIterator<Response, any, undefined>,
  _toolOutput?: ToolOutput,
) => Promise<UIStream>;
