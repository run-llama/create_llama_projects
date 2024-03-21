import { SimpleDirectoryReader } from "@llamaindex/edge/readers/SimpleDirectoryReader";
import { LlamaParseReader } from "@llamaindex/edge/readers/LlamaParseReader";

export const DATA_DIR = "./data";

export async function getDocuments() {
	const reader = new SimpleDirectoryReader();
	// Load PDFs using LlamaParseReader
	return await reader.loadData({
		directoryPath: DATA_DIR,
		fileExtToReader: {
			pdf: new LlamaParseReader({ resultType: "markdown" }),
		},
	});
}
