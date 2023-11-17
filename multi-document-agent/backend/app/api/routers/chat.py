from typing import List, cast

from fastapi.responses import StreamingResponse

from threading import Thread
from app.utils.json import json_to_model
from app.utils.index import get_agent
from fastapi import APIRouter, Depends, HTTPException, Request, status
from llama_index.llms.base import MessageRole, ChatMessage
from llama_index.agent import OpenAIAgent
from llama_index.chat_engine.types import StreamingAgentChatResponse
from pydantic import BaseModel
import logging

chat_router = r = APIRouter()


class _Message(BaseModel):
    role: MessageRole
    content: str


class _ChatData(BaseModel):
    messages: List[_Message]


@r.post("")
async def chat(
    request: Request,
    # Note: To support clients sending a JSON object using content-type "text/plain",
    # we need to use Depends(json_to_model(_ChatData)) here
    data: _ChatData = Depends(json_to_model(_ChatData)),
    agent: OpenAIAgent = Depends(get_agent),
):
    logger = logging.getLogger("uvicorn")
    # check preconditions and get last message
    if len(data.messages) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No messages provided",
        )
    lastMessage = data.messages.pop()
    if lastMessage.role != MessageRole.USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Last message must be from user",
        )
    # convert messages coming from the request to type ChatMessage
    messages = [
        ChatMessage(
            role=m.role,
            content=m.content,
        )
        for m in data.messages
    ]

    # start a new thread here
    # query chat engine
    # convert query engine to tool
    thread = Thread(target=agent.stream_chat, args=(lastMessage.content, messages))
    thread.start()
    logger.info("Querying chat engine")
    # response = agent.stream_chat(lastMessage.content, messages)

    # stream response
    def event_generator():
        queue = agent.callback_manager.handlers[0].queue

        # stream response
        while True:
            next_item = queue.get(True, 60.0)  # set a generous timeout of 60 seconds
            print((type(next_item), next_item))
            # check type of next_item, if string or not
            if isinstance(next_item, str):
                yield next_item
            else:
                response = cast(StreamingAgentChatResponse, next_item)
                for token in response.response_gen:
                    # # If client closes connection, stop sending events
                    # if await request.is_disconnected():
                    #     break
                    yield token
                # if not string, then it is the end of the stream
                break

        # while len(queue) > 0:
        #     item = queue.pop(0)
        #     yield item

        # for token in response.response_gen:
        #     # If client closes connection, stop sending events
        #     if await request.is_disconnected():
        #         break
        #     yield token

    return StreamingResponse(event_generator(), media_type="text/event-stream")
