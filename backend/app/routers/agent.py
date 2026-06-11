from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import asyncio
import json
from fastapi.responses import StreamingResponse

from app.database import get_db
from app.models import User, VoiceProfile, GenerationJob, JobStatus, AuditLog, AuditAction
from app.services.auth_service import get_current_user
from app.services.entitlement_service import check_generation_quota
from app.config import settings

# Import Google GenAI
from google import genai
import httpx

router = APIRouter()

class AgentChatRequest(BaseModel):
    voice_profile_id: str
    message: str
    mode: str = 'default' # default, interview, storytelling

class PromptEnhanceRequest(BaseModel):
    prompt: Optional[str] = ""

class PhraseEnhanceRequest(BaseModel):
    phrase: Optional[str] = ""

@router.post('/prompt/enhance')
async def enhance_prompt(
    body: PromptEnhanceRequest,
    current_user: User = Depends(get_current_user)
):
    prompt_text = body.prompt.strip() if body.prompt else ""
    
    try:
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
            return {"enhanced_prompt": prompt_text + " (enhanced mock)" if prompt_text else "A deep, raspy voice of an old wizard speaking slowly and mysteriously"}
        
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        if not prompt_text:
            system_instruction = "You are an expert prompt engineer for Vocaria AI. Your task is to generate a completely new, highly descriptive prompt for a Text-to-Speech AI describing a unique and interesting voice character. Specify the tone, age, gender, accent, and subtle vocal nuances, keeping it under 300 characters. Return ONLY the prompt, nothing else."
            contents = "Generate a random, high-quality voice description prompt."
        else:
            system_instruction = "You are an expert prompt engineer for Vocaria AI. Your task is to take a basic description of a voice and expand it into a detailed, highly descriptive prompt for a Text-to-Speech AI. Enhance the adjectives, specify the tone, age, and subtle vocal nuances, while keeping it under 300 characters. Maintain the original context but vastly improve the wording. Return ONLY the enhanced prompt."
            contents = prompt_text
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.8,
            )
        )
        return {"enhanced_prompt": response.text.strip()}
    except Exception as e:
        print(f"Gemini API error in enhance_prompt: {e}")
        try:
            print("Falling back to Groq API...")
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": contents}
                        ],
                        "temperature": 0.8
                    },
                    timeout=10.0
                )
                if resp.status_code == 200:
                    return {"enhanced_prompt": resp.json()["choices"][0]["message"]["content"].strip()}
        except Exception as groq_e:
            print(f"Groq API error in enhance_prompt: {groq_e}")
            
        return {"enhanced_prompt": prompt_text}

@router.post('/phrase/enhance')
async def enhance_phrase(
    body: PhraseEnhanceRequest,
    current_user: User = Depends(get_current_user)
):
    phrase_text = body.phrase.strip() if body.phrase else ""
    
    system_instruction = """You are an expert scriptwriter for AI voice generation. 
Your task is to provide a short spoken phrase (about 10-30 seconds of speech, roughly 25-75 words).
If the user provides an empty input, invent a creative, engaging monologue or statement that tests various vocal ranges and emotions.
If the user provides existing text, rewrite it to sound much more natural, engaging, and suitable for spoken word, keeping the same core meaning.
Return ONLY the final spoken text without any quotes, explanations, or markdown formatting."""

    try:
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
            raise ValueError("GEMINI_API_KEY not set")

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=phrase_text if phrase_text else "Create a random 20-second test monologue.",
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.8,
            )
        )
        return {"enhanced_phrase": response.text.strip()}
    except Exception as e:
        print(f"Gemini API error in enhance_phrase: {e}")
        try:
            print("Falling back to Groq API for phrase...")
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": phrase_text if phrase_text else "Create a random 20-second test monologue."}
                        ],
                        "temperature": 0.8
                    },
                    timeout=10.0
                )
                if resp.status_code == 200:
                    return {"enhanced_phrase": resp.json()["choices"][0]["message"]["content"].strip()}
        except Exception as groq_e:
            print(f"Groq API error in enhance_phrase: {groq_e}")
            
        return {"enhanced_phrase": phrase_text}

@router.post('/chat')
async def chat_with_agent(
    body: AgentChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    message = body.message.strip()
    if not message:
        raise HTTPException(400, 'message is required')

    # Verify profile first
    result = await db.execute(select(VoiceProfile).where(VoiceProfile.id == body.voice_profile_id))
    voice_profile = result.scalar_one_or_none()
    if not voice_profile:
        raise HTTPException(404, 'Voice profile not found')

    # 1. Generate LLM Response using Gemini
    system_instruction = "You are Vocaria AI, an advanced conversational agent. Keep responses natural, conversational, and concise for text-to-speech."
    if body.mode == 'interview':
        system_instruction = "You are Vocaria AI conducting an engaging interview. Ask thoughtful questions based on the user's input, keeping your responses brief and natural for voice."
    elif body.mode == 'storytelling':
        system_instruction = "You are Vocaria AI, a creative storyteller. Weave an engaging, concise narrative based on what the user says."

    bot_text = ""
    try:
        # Check if key is configured
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
            # Fallback mock if no key
            if body.mode == 'interview':
                bot_text = f'That is a very interesting point... Can you tell me more about your experience?'
            elif body.mode == 'storytelling':
                bot_text = f'Once upon a time, they said: {message}. And then the adventure truly began!'
            else:
                bot_text = f'I hear you saying: {message}. How can I assist you further with that?'
        else:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model='gemini-3.5-flash',
                contents=message,
                config=genai.types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                )
            )
            bot_text = response.text
            if not bot_text:
                bot_text = "I'm not sure how to respond to that."
    except Exception as e:
        print(f"Gemini API error in chat_with_agent: {e}")
        try:
            print("Falling back to Groq API...")
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": message}
                        ],
                        "temperature": 0.7
                    },
                    timeout=10.0
                )
                if resp.status_code == 200:
                    bot_text = resp.json()["choices"][0]["message"]["content"].strip()
                else:
                    bot_text = f"I'm sorry, I'm having trouble thinking right now."
        except Exception as groq_e:
            print(f"Groq API error in chat_with_agent: {groq_e}")
            bot_text = f"I'm sorry, I'm having trouble thinking right now."

    # 2. Trigger TTS Generation for the bot_text
    await check_generation_quota(current_user, len(bot_text), db)

    job = GenerationJob(
        user_id=current_user.id, voice_profile_id=body.voice_profile_id,
        status=JobStatus.QUEUED, text=bot_text, language='en',
        emotion='neutral', speaking_style='conversational',
        speed=1.0, pitch=1.0, temperature=0.7,
        output_format='wav', use_ssml=False,
        character_count=len(bot_text),
    )
    db.add(job)
    
    # Use standard AGENT_INTERACTION or similar. 
    # Wait, AuditAction doesn't have AGENT_INTERACTION. We'll use GENERATION_START and annotate it in details.
    db.add(AuditLog(user_id=current_user.id, action=AuditAction.GENERATION_START,
                    resource_type='agent_chat', details={'chars': len(bot_text), 'agent_mode': body.mode}))
    await db.commit()
    await db.refresh(job)

    from app.workers.generation_tasks import run_generation_task
    task = run_generation_task.delay(job_id=job.id, user_id=current_user.id)
    job.celery_task_id = task.id
    await db.commit()

    return {
        'job_id': job.id, 
        'text_response': bot_text, 
        'mode': body.mode
    }

class ChatMessage(BaseModel):
    role: str
    content: str

class SupportChatRequest(BaseModel):
    messages: list[ChatMessage]

@router.post('/support-chat')
async def support_chat(
    body: SupportChatRequest,
    current_user: User = Depends(get_current_user)
):
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        raise HTTPException(500, "Gemini API key is not configured on the server.")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    system_instruction = """You are Vocaria, the AI assistant for Vocaria — an enterprise voice AI platform. You help users with:

- Voice cloning using XTTS-v2 (zero-shot & fine-tune modes)
- Text-to-speech generation in 17 languages with emotion controls
- Deepfake detection using 5-model ensemble (AASIST, RawNet2, Prosodic, Spectral, Glottal)
- Live streaming analysis via WebSocket
- Public Voice Hub exploration
- API integration and authentication
- Plan/billing questions
- Quality analysis for audio samples

Also answer general questions. Be concise, helpful, and technical when needed. Reference specific features of the platform. Format responses clearly with markdown when helpful."""

    contents = []
    for msg in body.messages:
        role = 'user' if msg.role == 'user' else 'model'
        contents.append(
            genai.types.Content(role=role, parts=[genai.types.Part.from_text(msg.content)])
        )

    def generate():
        try:
            response_stream = client.models.generate_content_stream(
                model='gemini-2.5-flash',
                contents=contents,
                config=genai.types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                )
            )
            for chunk in response_stream:
                if chunk.text:
                    yield f"data: {json.dumps({'text': chunk.text})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            print(f"Gemini API error in support_chat: {e}")
            try:
                print("Falling back to Groq API...")
                groq_messages = [{"role": "system", "content": system_instruction}]
                for msg in body.messages:
                    groq_messages.append({"role": msg.role, "content": msg.content})
                
                with httpx.Client() as http_client:
                    resp = http_client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                        json={"model": "llama-3.1-8b-instant", "messages": groq_messages, "temperature": 0.7, "stream": True},
                        timeout=15.0
                    )
                    
                    if resp.status_code == 200:
                        for line in resp.iter_lines():
                            if line.startswith("data: "):
                                data_str = line[6:]
                                if data_str.strip() == "[DONE]":
                                    break
                                try:
                                    chunk_json = json.loads(data_str)
                                    text = chunk_json["choices"][0]["delta"].get("content", "")
                                    if text:
                                        yield f"data: {json.dumps({'text': text})}\n\n"
                                except Exception:
                                    pass
                        yield "data: [DONE]\n\n"
                    else:
                        print(f"Groq API returned status {resp.status_code}: {resp.text}")
                        yield f"data: {json.dumps({'error': 'The AI assistant is currently out of capacity.'})}\n\n"
            except Exception as groq_e:
                print(f"Groq API error in support_chat: {groq_e}")
                yield f"data: {json.dumps({'error': 'Failed to process request with both primary and fallback APIs'})}\n\n"
            
    return StreamingResponse(generate(), media_type="text/event-stream")
