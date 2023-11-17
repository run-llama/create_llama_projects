# Multi-document Agents

This is a [LlamaIndex](https://www.llamaindex.ai/) project bootstrapped with [`create-llama`](https://github.com/run-llama/LlamaIndexTS/tree/main/packages/create-llama).

We use our multi-document agent architecture:
- Individual agent per document capable of semantic search/summarization
- Orchestrator agent across documents that can pick relevant subsets

This also streams *all* intermediate results from the agent via a custom Callback handler.

## Main Files to Look At

This extends beyond the simple `create-llama` example. To see changes, look at the following files:
- `backend/app/utils/index.py` - contains core logic for constructing + getting multi-doc agent
- `backend/app/api/routers/chat.py` - contains implementation of chat endpoint + threading to stream intermediate responses.

## Getting Started

First, startup the backend as described in the [backend README](./backend/README.md).

Second, run the development server of the frontend as described in the [frontend README](./frontend/README.md).

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about LlamaIndex, take a look at the following resources:

- [LlamaIndex Documentation](https://docs.llamaindex.ai) - learn about LlamaIndex (Python features).
- [LlamaIndexTS Documentation](https://ts.llamaindex.ai) - learn about LlamaIndex (Typescript features).

You can check out [the LlamaIndexTS GitHub repository](https://github.com/run-llama/LlamaIndexTS) - your feedback and contributions are welcome!
