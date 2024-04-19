import {
  OpenAIEmbedding,
  ReplicateLLM,
  Settings,
  type ALL_AVAILABLE_REPLICATE_MODELS,
} from "llamaindex";

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 20;

export const initSettings = async () => {
  Settings.llm = new ReplicateLLM({
    model: process.env.MODEL as keyof typeof ALL_AVAILABLE_REPLICATE_MODELS,
  });
  Settings.chunkSize = CHUNK_SIZE;
  Settings.chunkOverlap = CHUNK_OVERLAP;
  Settings.embedModel = new OpenAIEmbedding({
    model: process.env.EMBEDDING_MODEL,
    dimensions: process.env.EMBEDDING_DIM
      ? parseInt(process.env.EMBEDDING_DIM)
      : undefined,
  });
};
