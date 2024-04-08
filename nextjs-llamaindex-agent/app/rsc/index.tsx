import "server-only";

import { createAI } from "ai/rsc";
import { nanoid } from "nanoid";
import { chatWithFlightAssistant, submitUserMessage } from "./actions/";
import { AIState, UIState } from "./type";

export const AI = createAI<AIState, UIState>({
  actions: {
    chatWithFlightAssistant,
    submitUserMessage,
  },
  initialAIState: { chatId: nanoid(), messages: [] },
  initialUIState: [],
});
