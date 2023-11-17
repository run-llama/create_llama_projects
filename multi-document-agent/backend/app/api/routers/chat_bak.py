from typing import List

from fastapi.responses import StreamingResponse

from app.utils.json import json_to_model
from app.utils.index import get_agent
from fastapi import APIRouter, Depends, HTTPException, Request, status
from llama_index.llms.base import MessageRole, ChatMessage
from llama_index.agent import OpenAIAgent
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
    logger.info("Querying chat engine")
    response = agent.stream_chat(lastMessage.content, messages)

    # stream response
    async def event_generator():
        queue = agent.callback_manager.handlers[0].queue
        while len(queue) > 0:
            item = queue.pop(0)
            yield item

        for token in response.response_gen:
            # If client closes connection, stop sending events
            if await request.is_disconnected():
                break
            yield token

    return StreamingResponse(event_generator(), media_type="text/plain")
