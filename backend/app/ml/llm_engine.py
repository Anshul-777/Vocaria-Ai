import logging
import asyncio
from typing import AsyncGenerator, List, Dict
import google.genai as genai
from google.genai import types
from app.config import settings

logger = logging.getLogger(__name__)

class LLMEngine:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set. LLM will fail.")
        self.client = genai.Client(api_key=self.api_key)
        self.model_name = "gemini-1.5-flash"

    def create_chat_session(self, system_instruction: str = "You are a helpful, conversational AI agent."):
        """Creates a stateful chat session."""
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7,
        )
        # Using the synchronous chats object but we'll wrap generation in async if needed
        # Actually google-genai supports async clients
        self.async_client = genai.Client(api_key=self.api_key, http_options={'api_version': 'v1alpha'})
        return self.async_client.chats.create(model=self.model_name, config=config)

    async def generate_response_stream(self, chat_session, user_message: str) -> AsyncGenerator[str, None]:
        """
        Sends a message to the chat session and yields text chunks as they arrive.
        """
        if not self.api_key:
            yield "I'm sorry, my brain is not configured. Missing API key."
            return

        try:
            # Depending on google-genai version, send_message_stream might be sync generator, 
            # we'll run it in executor if it blocks, but let's assume it supports async iteration or we wrap it
            loop = asyncio.get_event_loop()
            
            # Since standard google-genai stream is sync, we consume it in a thread and queue chunks
            # Or use async client if supported.
            
            def _get_stream():
                return chat_session.send_message_stream(user_message)
                
            stream = await loop.run_in_executor(None, _get_stream)
            
            for chunk in stream:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error(f"LLM Generation Error: {e}")
            yield " Sorry, I encountered an error thinking of a response."

_llm_engine = None

def get_llm_engine() -> LLMEngine:
    global _llm_engine
    if _llm_engine is None:
        _llm_engine = LLMEngine()
    return _llm_engine
