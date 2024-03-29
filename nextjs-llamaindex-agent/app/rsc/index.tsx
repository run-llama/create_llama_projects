import { createAI } from "ai/rsc";
import { nanoid } from "nanoid";
import { submitUserMessage } from "./actions/";
import { AIState, UIState } from "./type";

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
  },
  initialAIState: { chatId: nanoid(), messages: [] },
  initialUIState: [],
});
