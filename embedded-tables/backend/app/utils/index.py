import logging
import os

from llama_index import (
    StorageContext,
    VectorStoreIndex,
    load_index_from_storage,
)
from llama_index.readers.file.flat_reader import FlatReader
from llama_index.node_parser import (
    UnstructuredElementNodeParser,
)
from llama_index.query_engine import RetrieverQueryEngine
from llama_index.retrievers import RecursiveRetriever
from llama_index.tools.query_engine import QueryEngineTool
from llama_index.agent import OpenAIAgent
from llama_index.llms import OpenAI
from llama_index.callbacks import CallbackManager
from llama_index.callbacks.base_handler import BaseCallbackHandler
from llama_index.callbacks.schema import CBEventType

from typing import Optional, Dict, Any, List, Tuple

from pathlib import Path
import os
import pickle


STORAGE_DIR = "./storage"  # directory to cache the generated index
DATA_DIR = "./data/tesla"  # directory containing the documents to index


class StreamingCallbackHandler(BaseCallbackHandler):
    """Base callback handler that can be used to track event starts and ends."""

    def __init__(self) -> None:
        """Initialize the base callback handler."""
        super().__init__([], [])
        self._queue = []
        self._counter = 0

    def on_event_start(
        self,
        event_type: CBEventType,
        payload: Optional[Dict[str, Any]] = None,
        event_id: str = "",
        parent_id: str = "",
        **kwargs: Any,
    ) -> str:
        """Run when an event starts and return id of event."""
        if event_type == CBEventType.FUNCTION_CALL:
            arguments_str = payload["function_call"]
            tool_str = payload["tool"].name
            print_str = (
                "\n\n\n\n\n=== Calling Function ===\n\n\n\n"
                f"Calling function: {tool_str} with args: {arguments_str}\n\n"
            )
            # Add this to queue
            self._queue.append(print_str)
        

    def on_event_end(
        self,
        event_type: CBEventType,
        payload: Optional[Dict[str, Any]] = None,
        event_id: str = "",
        **kwargs: Any,
    ) -> None:
        """Run when an event ends."""
        if event_type == CBEventType.FUNCTION_CALL:
            response = payload["function_call_response"]
            # Add this to queue
            print_str = (
                f"\n\nGot output: {response}\n"
                "========================\n\n"
            )
            self._queue.append(print_str)

    def reset(self) -> None:
        """Reset the callback handler."""
        self._queue = []
        self._counter = 0

    @property
    def queue(self) -> List[str]:
        """Get the queue of events."""
        return self._queue

    @property
    def counter(self) -> int:
        """Get the counter."""
        return self._counter

    def start_trace(self, trace_id: Optional[str] = None) -> None:
        """Run when an overall trace is launched."""
        pass

    def end_trace(
        self,
        trace_id: Optional[str] = None,
        trace_map: Optional[Dict[str, List[str]]] = None,
    ) -> None:
        """Run when an overall trace is exited."""
        pass


def _get_index_and_mappings(
    data_path: str, 
    out_index_path: str,
    out_node_mappings_path: str,
    logger: logging.Logger
) -> Tuple[VectorStoreIndex, Dict]:
    """Get vector index and node mappings.

    Load from storage if exists, otherwise create new index and save to storage.
    
    """
    if not (Path(out_index_path)).exists():

        node_parser = UnstructuredElementNodeParser()

        logger.info(f"Creating hierarchical node tree from tesla 10k documents")
        reader = FlatReader()
        docs = reader.load_data(data_path)
        raw_nodes = node_parser.get_nodes_from_documents(docs)

        base_nodes, node_mappings = node_parser.get_base_nodes_and_mappings(
            raw_nodes
        )

        # construct top-level vector index + query engine
        logger.info(f"Indexing nodes.")
        vector_index = VectorStoreIndex(base_nodes)

        # save vector index to storage
        vector_index.storage_context.persist(out_index_path)
        # for simplicity, going to pickle node_mappings
        pickle.dump(node_mappings, open(out_node_mappings_path, "wb"))
        logger.info(f"Finished creating new index. Stored in {out_index_path}")

    else:
        storage_context = StorageContext.from_defaults(persist_dir=out_index_path)
        vector_index = load_index_from_storage(storage_context)
        logger.info(f"Finished loading index from {out_index_path}")

        node_mappings = pickle.load(open(out_node_mappings_path, "rb"))

    return vector_index, node_mappings
        


def _get_query_tool(
    vector_index: VectorStoreIndex, node_mappings: Dict, name: str, description: str,
    top_k: int = 4
) -> QueryEngineTool:
    """Given a vector index and node mappings, return a query tool.

    This query tool can do recursive retrieval on the vector index.
    
    """
    vector_retriever = vector_index.as_retriever(similarity_top_k=top_k)

    # define recursive retriever
    recursive_retriever = RecursiveRetriever(
        "vector",
        retriever_dict={"vector": vector_retriever},
        node_dict=node_mappings,
        verbose=True,
    )

    # define query engine
    query_engine = RetrieverQueryEngine.from_args(recursive_retriever)
    # convert query engine to tool
    query_engine_tool = QueryEngineTool.from_defaults(
        query_engine=query_engine,
        name=name,
        description=description,
    )

    return query_engine_tool


def get_agent():
    logger = logging.getLogger("uvicorn")

    vector_index_2021, node_mappings_2021 = _get_index_and_mappings(
        data_path=Path(DATA_DIR) / "tesla_2021_10k.htm",
        out_index_path=Path(STORAGE_DIR) / "2021_index",
        out_node_mappings_path=Path(DATA_DIR) / "node_mappings_2021.pkl",
        logger=logger
    )

    vector_index_2020, node_mappings_2020 = _get_index_and_mappings(
        data_path=Path(DATA_DIR) / "tesla_2020_10k.htm",
        out_index_path=Path(STORAGE_DIR) / "2020_index",
        out_node_mappings_path=Path(DATA_DIR) / "node_mappings_2020.pkl",
        logger=logger
    )

    query_tool_2021 = _get_query_tool(
        vector_index=vector_index_2021,
        node_mappings=node_mappings_2021,
        name="2021_tesla_10k",
        description="Use this tool to query the 2021 Tesla 10-K",
        top_k=4
    )
    query_tool_2020 = _get_query_tool(
        vector_index=vector_index_2020,
        node_mappings=node_mappings_2020,
        name="2020_tesla_10k",
        description="Use this tool to query the 2020 Tesla 10-K",
        top_k=4
    )
    query_tools = [
        query_tool_2021,
        query_tool_2020
    ]

    handler = StreamingCallbackHandler()
    callback_manager = CallbackManager([handler])
    llm = OpenAI("gpt-4-1106-preview")
    agent = OpenAIAgent.from_tools(
        tools=query_tools,
        llm=llm,
        callback_manager=callback_manager,
    )

    logger.info(f"Built agent.")
        
    return agent
