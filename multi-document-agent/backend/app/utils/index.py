import json
import logging
import os
from pydantic import BaseModel
import requests

from llama_index import (
    StorageContext,
    VectorStoreIndex,
    load_index_from_storage,
    SimpleDirectoryReader,
    SummaryIndex,
    ServiceContext,
)
from llama_index.readers.file.flat_reader import FlatReader
from llama_index.node_parser import UnstructuredElementNodeParser, SentenceSplitter
from llama_index.query_engine import RetrieverQueryEngine
from llama_index.retrievers import RecursiveRetriever
from llama_index.tools import QueryEngineTool, ToolMetadata
from llama_index.agent import OpenAIAgent
from llama_index.llms import OpenAI
from llama_index.callbacks import CallbackManager
from llama_index.callbacks.base_handler import BaseCallbackHandler
from llama_index.callbacks.schema import CBEventType
from llama_index.objects import ObjectIndex, SimpleToolNodeMapping
from queue import Queue

from typing import Optional, Dict, Any, List, Tuple

from pathlib import Path
import os
import pickle


STORAGE_DIR = "./storage"  # directory to cache the generated index
DATA_DIR = "./data"  # directory containing the documents to index


class EventObject(BaseModel):
    type: str
    payload: dict


class StreamingCallbackHandler(BaseCallbackHandler):
    """Callback handler specifically designed to stream function calls to a queue."""

    def __init__(self, queue: Queue) -> None:
        """Initialize the base callback handler."""
        super().__init__([], [])
        self._queue = queue
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
            self._queue.put(
                EventObject(
                    type="function_call",
                    payload={
                        "arguments_str": payload["function_call"],
                        "tool_str": payload["tool"].name,
                    },
                )
            )

    def on_event_end(
        self,
        event_type: CBEventType,
        payload: Optional[Dict[str, Any]] = None,
        event_id: str = "",
        **kwargs: Any,
    ) -> None:
        """Run when an event ends."""
        if event_type == CBEventType.FUNCTION_CALL:
            self._queue.put(
                EventObject(
                    type="function_call_response",
                    payload={"response": payload["function_call_response"]},
                )
            )
        elif event_type == CBEventType.AGENT_STEP:
            # put response into queue
            self._queue.put(payload["response"])

    @property
    def queue(self) -> Queue:
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


def _download_data(out_dir: str, wiki_titles: List[str]) -> None:
    """Download data."""
    city_docs = {}
    for title in wiki_titles:
        if not os.path.exists(f"{out_dir}/{title}.txt"):
            response = requests.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "query",
                    "format": "json",
                    "titles": title,
                    "prop": "extracts",
                    # 'exintro': True,
                    "explaintext": True,
                },
            ).json()
            page = next(iter(response["query"]["pages"].values()))
            wiki_text = page["extract"]

            data_path = Path(out_dir)
            if not data_path.exists():
                Path.mkdir(data_path)

            with open(data_path / f"{title}.txt", "w") as fp:
                fp.write(wiki_text)
        else:
            pass

        # load into city docs
        city_docs[title] = SimpleDirectoryReader(
            input_files=[f"{out_dir}/{title}.txt"]
        ).load_data()

    return city_docs


def _build_document_agents(
    storage_dir: str, city_docs: Dict[str, Any], callback_manager: CallbackManager
) -> Dict:
    """Build document agents."""
    node_parser = SentenceSplitter()
    llm = OpenAI(temperature=0, model="gpt-3.5-turbo")
    service_context = ServiceContext.from_defaults(llm=llm)

    # Build agents dictionary
    agents = {}

    # this is for the baseline
    all_nodes = []

    for idx, wiki_title in enumerate(city_docs.keys()):
        nodes = node_parser.get_nodes_from_documents(city_docs[wiki_title])
        all_nodes.extend(nodes)

        if not os.path.exists(f"./{storage_dir}/{wiki_title}"):
            # build vector index
            vector_index = VectorStoreIndex(nodes, service_context=service_context)
            vector_index.storage_context.persist(
                persist_dir=f"./{storage_dir}/{wiki_title}"
            )
        else:
            vector_index = load_index_from_storage(
                StorageContext.from_defaults(
                    persist_dir=f"./{storage_dir}/{wiki_title}"
                ),
                service_context=service_context,
            )

        # build summary index
        summary_index = SummaryIndex(nodes, service_context=service_context)
        # define query engines
        vector_query_engine = vector_index.as_query_engine()
        summary_query_engine = summary_index.as_query_engine()

        # define tools
        query_engine_tools = [
            QueryEngineTool(
                query_engine=vector_query_engine,
                metadata=ToolMetadata(
                    name="vector_tool",
                    description=(
                        "Useful for questions related to specific aspects of"
                        f" {wiki_title} (e.g. the history, arts and culture,"
                        " sports, demographics, or more)."
                    ),
                ),
            ),
            QueryEngineTool(
                query_engine=summary_query_engine,
                metadata=ToolMetadata(
                    name="summary_tool",
                    description=(
                        "Useful for any requests that require a holistic summary"
                        f" of EVERYTHING about {wiki_title}. For questions about"
                        " more specific sections, please use the vector_tool."
                    ),
                ),
            ),
        ]

        # build agent
        function_llm = OpenAI(model="gpt-4")
        agent = OpenAIAgent.from_tools(
            query_engine_tools,
            llm=function_llm,
            verbose=True,
            system_prompt=f"""\
    You are a specialized agent designed to answer queries about {wiki_title}.
    You must ALWAYS use at least one of the tools provided when answering a question; do NOT rely on prior knowledge.\
    """,
            callback_manager=callback_manager,
        )

        agents[wiki_title] = agent

    return agents


def _build_top_agent(
    storage_dir: str, doc_agents: Dict, callback_manager: CallbackManager
) -> OpenAIAgent:
    """Build top-level agent."""
    # define tool for each document agent
    all_tools = []
    for wiki_title in doc_agents.keys():
        wiki_summary = (
            f"This content contains Wikipedia articles about {wiki_title}. Use"
            f" this tool if you want to answer any questions about {wiki_title}.\n"
        )
        doc_tool = QueryEngineTool(
            query_engine=doc_agents[wiki_title],
            metadata=ToolMetadata(
                name=f"tool_{wiki_title}",
                description=wiki_summary,
            ),
        )
        all_tools.append(doc_tool)
    tool_mapping = SimpleToolNodeMapping.from_objects(all_tools)
    # if obj_index doesn't already exist
    if not os.path.exists(f"./{storage_dir}/top"):
        storage_context = StorageContext.from_defaults()
        obj_index = ObjectIndex.from_objects(
            all_tools, tool_mapping, VectorStoreIndex, storage_context=storage_context
        )
        storage_context.persist(persist_dir=f"./{storage_dir}/top")
        # TODO: don't access private property

    else:
        # initialize storage context from existing storage
        storage_context = StorageContext.from_defaults(
            persist_dir=f"./{storage_dir}/top"
        )
        index = load_index_from_storage(storage_context)
        obj_index = ObjectIndex(index, tool_mapping)

    top_agent = OpenAIAgent.from_tools(
        tool_retriever=obj_index.as_retriever(similarity_top_k=3),
        system_prompt=""" \
    You are an agent designed to answer queries about a set of given cities.
    Please always use the tools provided to answer a question. Do not rely on prior knowledge.\

    """,
        verbose=True,
        callback_manager=callback_manager,
    )

    return top_agent


WIKI_TITLES = [
    "Toronto",
    "Seattle",
    "Chicago",
    "Boston",
    "Houston",
    "Tokyo",
    "Berlin",
    "Lisbon",
    "Paris",
    "London",
    "Atlanta",
    "Munich",
    "Shanghai",
    "Beijing",
    "Copenhagen",
    "Moscow",
    "Cairo",
    "Karachi",
]


def get_agent():
    logger = logging.getLogger("uvicorn")

    # download data
    city_docs = _download_data(DATA_DIR, WIKI_TITLES)

    # define callback manager with streaming
    queue = Queue()
    handler = StreamingCallbackHandler(queue)
    callback_manager = CallbackManager([handler])

    # build agent for each document
    doc_agents = _build_document_agents(
        STORAGE_DIR, city_docs, callback_manager=callback_manager
    )

    # build top-level agent
    top_agent = _build_top_agent(STORAGE_DIR, doc_agents, callback_manager)

    logger.info(f"Built agent.")

    return top_agent
