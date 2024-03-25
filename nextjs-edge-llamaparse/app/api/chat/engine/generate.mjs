import * as dotenv from "dotenv";
import { VectorStoreIndex } from "@llamaindex/edge";
import { storageContextFromDefaults } from "@llamaindex/edge/storage/StorageContext";
import { PineconeVectorStore } from "@llamaindex/edge/storage/vectorStore/PineconeVectorStore";

import { getDocuments } from "./loader.mjs";
import { checkRequiredEnvVars } from "./shared.mjs";

dotenv.config();

async function loadAndIndex() {
  // load objects from storage and convert them into LlamaIndex Document objects
  const documents = await getDocuments();

  // create vector store
  const vectorStore = new PineconeVectorStore();

  // create index from all the Documentss and store them in Pinecone
  console.log("Start creating embeddings...");
  const storageContext = await storageContextFromDefaults({ vectorStore });
  await VectorStoreIndex.fromDocuments(documents, { storageContext });
  console.log(
    "Successfully created embeddings and save to your Pinecone index.",
  );
}

(async () => {
  checkRequiredEnvVars();
  await loadAndIndex();
  console.log("Finished generating storage.");
})();
