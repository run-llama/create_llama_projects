import { CHUNK_OVERLAP, CHUNK_SIZE, STORAGE_CACHE_DIR } from "@/constants.mjs";

import {
  serviceContextFromDefaults,
  SimpleVectorStore,
  VectorStoreIndex,
} from "llamaindex";
import * as path from "path";

export async function createRetriever() {
  // set up vector store index with two vector stores, one for text, the other for images
  const serviceContext = serviceContextFromDefaults({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });
  const vectorStore = await SimpleVectorStore.fromPersistDir(
    path.join(STORAGE_CACHE_DIR, "text")
  );
  const imageVectorStore = await SimpleVectorStore.fromPersistDir(
    path.join(STORAGE_CACHE_DIR, "images")
  );
  const index = await VectorStoreIndex.init({
    serviceContext,
    imageVectorStore,
    vectorStore,
  });
  const retriever = index.asRetriever();
  retriever.similarityTopK = 3;
  return retriever;
}
