import {
  serviceContextFromDefaults,
  SimpleDirectoryReader,
  SimpleVectorStore,
  VectorStoreIndex,
} from "llamaindex";

import * as dotenv from "dotenv";

import {
  CHUNK_OVERLAP,
  CHUNK_SIZE,
  STORAGE_CACHE_DIR,
  STORAGE_DIR,
} from "../../../../constants.mjs";
import path from "path";

// Load environment variables from local .env file
dotenv.config();

async function getRuntime(func) {
  const start = Date.now();
  await func();
  const end = Date.now();
  return end - start;
}

async function generateDatasource(serviceContext) {
  console.log(`Generating storage...`);
  // Split documents, create embeddings and store them in the storage context
  const ms = await getRuntime(async () => {
    const documents = await new SimpleDirectoryReader().loadData({
      directoryPath: STORAGE_DIR,
    });
    // set up vector store index with two vector stores, one for text, the other for images
    const vectorStore = await SimpleVectorStore.fromPersistDir(
      path.join(STORAGE_CACHE_DIR, "text")
    );
    const imageVectorStore = await SimpleVectorStore.fromPersistDir(
      path.join(STORAGE_CACHE_DIR, "images")
    );
    await VectorStoreIndex.fromDocuments(documents, {
      serviceContext,
      imageVectorStore,
      vectorStore,
    });
  });
  console.log(`Storage successfully generated in ${ms / 1000}s.`);
}

(async () => {
  const serviceContext = serviceContextFromDefaults({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  await generateDatasource(serviceContext);
  console.log("Finished generating storage.");
})();
