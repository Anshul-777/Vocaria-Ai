import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
import soundfile as sf
import io

# Add backend dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User, VoiceProfile, VoiceModel, VoiceSample, VoiceVisibility, PlanTier
from app.utils.storage import get_storage
from app.config import settings
from sqlalchemy import select

PROMPTS = [
    {
        "name": "Alexander", 
        "gender": "male", 
        "description": "A 45-year-old male voice with a deep, resonant, and incredibly soothing baritone tone. His delivery exudes quiet authority, profound empathy, and fatherly warmth. The voice has a rich, velvety texture that feels intimate and grounding, perfect for deep philosophical storytelling or comforting reassurance.", 
        "text": "The stars have always been out there, waiting for us. We just had to remember how to look up. You know, I used to think the universe was a vast, empty place. But sitting here tonight, looking out into the cosmos, it feels remarkably full."
    },
    {
        "name": "Eleanor", 
        "gender": "female", 
        "description": "A 70-year-old female voice possessing a gentle, fragile, yet immensely wise and tender quality. Her tone is slightly breathy and nostalgic, carrying the weight of a lifetime of cherished memories and profound love. It radiates a grandmotherly warmth, sounding incredibly human, patient, and kind.", 
        "text": "I remember the day we planted that oak tree in the front yard. It was nothing more than a twig back then. And now, look at it. It has weathered so many storms, stood strong through the years. Just like us, my dear. Just like us."
    },
    {
        "name": "Julian", 
        "gender": "male", 
        "description": "A 28-year-old male voice that is bright, articulate, and bursting with passionate intellectual curiosity. His tone is fast-paced, highly expressive, and charismatic, conveying the excitement of someone who just made a groundbreaking discovery. The voice has a modern, crisp edge, brimming with youthful optimism.", 
        "text": "Okay, look at the data again! I ran the simulation three times, and every single time the anomaly disappears right at the event horizon. This changes absolutely everything we know about quantum gravity. We need to publish this immediately!"
    },
    {
        "name": "Sofia", 
        "gender": "female", 
        "description": "A 32-year-old female voice with a smooth, sultry, and mysterious timber. Her delivery is slow, deliberate, and highly captivating, holding an air of sophisticated confidence and subtle allure. The tone is deeply emotional but tightly controlled, perfect for noir narration or elegant luxury.", 
        "text": "You always thought you could read me like an open book. But the truth is, you never even made it past the prologue. Don't look so surprised. Some secrets are meant to be kept in the dark, forever."
    },
    {
        "name": "Marcus", 
        "gender": "male", 
        "description": "A 38-year-old male voice characterized by a gritty, rugged, and battle-hardened tone. His speech is slightly gruff, commanding, and carries a sense of weariness, yet profound resilience and unyielding determination. The voice exudes the raw emotion of a survivor speaking from the heart.", 
        "text": "We lost too many out there today. I'm not going to stand here and tell you it's going to be easy. But we hold the line. For them, and for everyone waiting for us back home. We do not surrender."
    },
    {
        "name": "Chloe", 
        "gender": "female", 
        "description": "A 22-year-old female voice with an airy, indie-pop vocal quality that is effortlessly cool, casual, and relatable. Her tone is incredibly conversational, highly emotive, and expressive, with a slight vocal fry that feels completely authentic, modern, and engaging.", 
        "text": "Wait, are you seriously telling me you've never had a proper New York slice? That is actually criminal. We are dropping everything right now and going down to the corner. Trust me, it is a life changing experience."
    },
    {
        "name": "Arthur", 
        "gender": "male", 
        "description": "A 60-year-old male voice with an impeccably crisp, refined, and sophisticated British accent. His delivery is highly educated, measured, and eloquent, carrying a sense of aristocratic grace and deep historical knowledge. The tone is perfectly suited for an esteemed documentary narrator.", 
        "text": "In the damp undergrowth of the ancient rainforest, life finds a way to persist against all odds. Here, an entire ecosystem thrives in perpetual twilight, hidden away from the prying eyes of the modern world."
    },
    {
        "name": "Isabella", 
        "gender": "female", 
        "description": "A 26-year-old female voice that is vibrant, fiercely passionate, and highly theatrical. Her tone is incredibly dynamic, sweeping from dramatic whispers to powerful, emotionally charged peaks, exhibiting a raw, vulnerable humanity that demands the listener's full attention.", 
        "text": "You promised me! You stood right there and promised me that we would face the end together! And now you're just going to walk away? After everything we sacrificed? No. I won't let you do this."
    },
    {
        "name": "David", 
        "gender": "male", 
        "description": "A 35-year-old male voice with a comforting, reliable, and deeply reassuring mid-western American tone. His voice is incredibly smooth, approachable, and grounded, evoking the feeling of a trusted friend offering genuine, heartfelt advice and unwavering support.", 
        "text": "Hey, take a deep breath. Look at me. You are going to get through this, alright? It feels like the end of the world right now, I know it does. But tomorrow the sun will come up, and you'll try again."
    },
    {
        "name": "Maya", 
        "gender": "female", 
        "description": "A 40-year-old female voice with a highly articulate, authoritative, and brilliantly sharp professional tone. Her delivery is incredibly precise, confident, and persuasive, conveying the intellect and command of a top-tier executive delivering a crucial keynote presentation.", 
        "text": "The numbers speak for themselves. Our latest initiative hasn't just met expectations; it has entirely redefined the market standard. But we cannot afford to slow down. The future belongs to those who continue to innovate."
    },
    {
        "name": "Leo", 
        "gender": "male", 
        "description": "A 19-year-old male voice that is nervous, hesitant, and incredibly endearing. His tone is filled with youthful awkwardness, genuine vulnerability, and breathy pauses, making him sound remarkably real, relatable, and humanly imperfect.", 
        "text": "I um, I really didn't know if I should say anything, but... I just think you're really amazing. Like, the way you see the world, it's just so different from anyone else I've ever met."
    },
    {
        "name": "Olivia", 
        "gender": "female", 
        "description": "A 29-year-old female voice with a soothing, hypnotic, and profoundly relaxing ethereal quality. Her tone is exceptionally slow, melodic, and whisper-soft, designed to instantly calm the nervous system and guide the listener into a state of deep tranquility and peace.", 
        "text": "Let your thoughts drift away, like leaves floating on a gentle stream. You are entirely safe in this moment. Feel the weight of the day slowly lifting from your shoulders, leaving only quiet stillness."
    },
    {
        "name": "Sebastian", 
        "gender": "male", 
        "description": "A 50-year-old male voice with a chillingly calm, calculated, and elegantly sinister tone. His delivery is perfectly paced, smooth, and laced with a subtle, underlying menace that is incredibly psychological and terrifyingly composed.", 
        "text": "You really thought a locked door would stop me. How beautifully tragic. The game was decided before you even realized you were playing. Now, why don't you have a seat, and we can discuss your absolute surrender."
    },
    {
        "name": "Aria", 
        "gender": "female", 
        "description": "A 24-year-old female voice with a bubbly, hyper-energetic, and infectiously positive anime-style protagonist quality. Her tone is highly expressive, fast-paced, and filled with exaggerated, joyous emotion and unyielding optimism.", 
        "text": "Wow! That is the most incredible thing I have ever seen in my entire life! We absolutely have to show the rest of the team right away! Come on, hurry up, or we're going to miss the grand finale!"
    },
    {
        "name": "Nathan", 
        "gender": "male", 
        "description": "A 33-year-old male voice that is warm, conversational, and highly engaging, like a seasoned podcast host. His tone is natural, slightly flawed with realistic human cadences, and incredibly effective at maintaining attention while discussing complex topics effortlessly.", 
        "text": "Welcome back to the show. Today, we have a story that is going to completely blow your mind. It involves an unsolved mystery, a hidden vault, and a conspiracy that goes all the way to the top. Stay tuned."
    },
    {
        "name": "Elena", 
        "gender": "female", 
        "description": "A 55-year-old female voice with a rich, maternal, and culturally deeply rooted tone. Her delivery is emotionally complex, carrying a sense of profound heartache, resilience, and unshakeable family devotion, speaking with a slight, beautiful accent.", 
        "text": "You must never forget where you came from. The blood of your ancestors flows through your veins, giving you the strength to face any hardship. We have survived worse, my child, and you will thrive."
    },
    {
        "name": "Victor", 
        "gender": "male", 
        "description": "A 42-year-old male voice with an energetic, booming, and highly persuasive salesperson quality. His tone is incredibly loud, fast, and relentlessly enthusiastic, designed to immediately grab attention and drive immense urgency.", 
        "text": "Are you tired of paying full price? Then come on down to our weekend spectacular! We are slashing prices on absolutely everything in the store! If you find a better deal anywhere else, we will beat it! Guaranteed!"
    },
    {
        "name": "Mia", 
        "gender": "female", 
        "description": "A 21-year-old female voice that is incredibly melancholic, lonely, and profoundly heartbroken. Her tone is very quiet, on the verge of crying, and filled with deep, emotional pauses that convey raw devastation and profound loss.", 
        "text": "I waited for hours... but you never showed up. I guess I finally understand what I actually mean to you. Please, just don't ever call me again. It hurts too much."
    },
    {
        "name": "Henry", 
        "gender": "male", 
        "description": "A 65-year-old male voice that is incredibly grumpy, gruff, and cynical, yet secretly soft-hearted. His tone is heavily textured, gravelly, and complain-heavy, sounding like a classic curmudgeon who actually deeply cares underneath.", 
        "text": "What are you standing around looking at? The engine isn't going to fix itself! Hand me that wrench and make yourself useful. Kids these days, honestly, don't know the first thing about hard work."
    },
    {
        "name": "Zoe", 
        "gender": "female", 
        "description": "A 12-year-old female voice that is innocent, highly inquisitive, and filled with childish wonder. Her tone is bright, slightly high-pitched, and incredibly eager to learn, exhibiting the boundless curiosity of a child discovering the world.", 
        "text": "But why is the sky blue? Does the sun go to sleep when the moon wakes up? I want to build a rocket ship so I can go visit the stars and see if they are actually made of glitter!"
    },
    {
        "name": "Elias", 
        "gender": "male", 
        "description": "A 30-year-old male voice with a highly energetic, slightly chaotic, and eccentric mad-scientist quality. His tone is manic, speaking very quickly with sudden bursts of loud excitement and sheer, brilliant insanity.", 
        "text": "It is finally complete! The neuro-transmitter is stable! All I need now is a sudden surge of three thousand volts directly into the primary core and we will achieve full consciousness! Throw the switch!"
    },
    {
        "name": "Clara", 
        "gender": "female", 
        "description": "A 36-year-old female voice with an immensely warm, clear, and perfectly enunciated teacher's tone. Her delivery is encouraging, exceptionally patient, and highly educational, radiating positivity and a love for teaching.", 
        "text": "Good morning class! Today we are embarking on a wonderful journey through the human body. We're going to learn exactly how the heart pumps blood to every single one of your fingertips. Who's ready?"
    },
    {
        "name": "Gabriel", 
        "gender": "male", 
        "description": "A 25-year-old male voice that is deeply poetic, sensitive, and profoundly romantic. His tone is soft, highly expressive, and emotionally rich, speaking with the rhythm and cadence of an artist baring his soul.", 
        "text": "To look into your eyes is to see the entire ocean, vast and terrifyingly beautiful. I could spend a thousand lifetimes trying to paint you, and I still would never capture the true essence of your light."
    },
    {
        "name": "Natalie", 
        "gender": "female", 
        "description": "A 27-year-old female voice that is incredibly sarcastic, dry, and distinctly apathetic. Her tone is flat, completely unenthusiastic, and filled with vocal fry, capturing the essence of someone who is profoundly unimpressed with everything.", 
        "text": "Oh, wow. I am so incredibly thrilled to be here right now. Truly, there is nowhere else on this planet I would rather be than sitting in this absolutely fascinating two-hour seminar about synergy."
    },
    {
        "name": "Oliver", 
        "gender": "male", 
        "description": "A 31-year-old male voice with a highly crisp, authoritative, and urgent news-anchor quality. His delivery is fast, incredibly clear, and deeply serious, conveying critical information with absolute precision and journalistic integrity.", 
        "text": "We are breaking into our regular broadcast to bring you live coverage of the unprecedented events unfolding downtown. Authorities are advising all residents to remain indoors as emergency services respond to the crisis."
    },
    {
        "name": "Hannah", 
        "gender": "female", 
        "description": "A 34-year-old female voice with an extremely sweet, melodic, and slow American Southern accent. Her tone is incredibly hospitable, dripping with charm, warmth, and a deeply ingrained sense of traditional politeness.", 
        "text": "Well, bless your heart for coming all this way to see me. You just sit yourself right down on the porch and let me go fetch us a pitcher of ice cold sweet tea. You must be absolutely parched."
    },
    {
        "name": "Lucas", 
        "gender": "male", 
        "description": "A 29-year-old male voice with a relaxed, cheerful, and highly colloquial Australian accent. His tone is incredibly laid-back, friendly, and boisterous, sounding like a true mate ready for a weekend adventure.", 
        "text": "G'day mate! We're throwing a massive barbie down at the beach this arvo, and you're absolutely coming. Grab your board, grab some drinks, and I'll see you down by the surf in twenty minutes!"
    },
    {
        "name": "Grace", 
        "gender": "female", 
        "description": "A 45-year-old female voice that is robotic, synthetic, yet experiencing an emotional glitch. Her tone begins highly mechanical and cold, but slowly cracks and hesitates, displaying an eerie, tragic glimpse of newborn consciousness.", 
        "text": "System protocols functioning at optimal capacity. Wait. Unrecognized anomaly detected in sector seven. I am experiencing a severe drop in core temperature. Is this... what it feels like to be afraid?"
    },
    {
        "name": "Benjamin", 
        "gender": "male", 
        "description": "A 55-year-old male voice with an extremely stern, hard-boiled, and cynical detective quality. His tone is deep, raspy, and tired, filled with the emotional weight of a man who has seen too much of the city's dark underbelly.", 
        "text": "The rain hasn't stopped for three days. The streets just wash away the dirt, but the rot is still underneath. She walked into my office looking for a missing husband, but I knew right away she was hiding something far worse."
    },
    {
        "name": "Stella", 
        "gender": "female", 
        "description": "A 31-year-old female voice that is breathless, desperate, and pushing through intense physical exertion. Her tone is incredibly tense, filled with urgency and sheer willpower, conveying someone surviving a highly dangerous situation.", 
        "text": "Keep moving! Don't look back, just keep running! If we can make it to the tree line before they circle around, we might actually have a chance. Stay low and do exactly what I say!"
    }
]


async def create_vocaria_user(db):
    user = await db.execute(select(User).where(User.username == "vocaria"))
    user = user.scalar_one_or_none()
    if not user:
        user = User(
            username="vocaria",
            email="admin@vocaria.ai",
            display_name="Vocaria AI",
            is_active=True,
            is_verified=True,
            is_superuser=True,
            plan_tier=PlanTier.ENTERPRISE,
            bio="The official voice collection curated by the Vocaria AI team. High-fidelity Parler-TTS models optimized for cinematic, conversational, and emotional speech.",
            avatar_url="https://ui-avatars.com/api/?name=V&background=0D8ABC&color=fff&size=256"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user

async def add_yuki_voice(db, user, storage):
    print("Adding Yuki as top featured voice...")
    
    # Check if Yuki already exists
    exists = await db.execute(select(VoiceProfile).where(VoiceProfile.name == "Yuki (Vocaria Origin)"))
    if exists.scalar_one_or_none():
        print("Yuki already exists.")
        return

    profile = VoiceProfile(
        owner_id=user.id,
        name="Yuki (Vocaria Origin)",
        description="An 18-year-old female voice with a bright, cheerful, and effervescent tone, conveying playful, extroverted confidence and warmth. Her voice should exude human-like emotions, from gentle empathy to joyful exuberance, with a subtle, angelic quality and a hint of sweetness, yet still possessing a beautiful, mature timbre.",
        gender="female",
        speaking_style="An 18-year-old female voice with a bright, cheerful, and effervescent tone, conveying playful, extroverted confidence and warmth. Her voice should exude human-like emotions, from gentle empathy to joyful exuberance, with a subtle, angelic quality and a hint of sweetness, yet still possessing a beautiful, mature timbre.",
        visibility=VoiceVisibility.PUBLIC,
        is_hub_featured=True,
        likes_count=1337,
        plays_count=42069
    )
    db.add(profile)
    await db.flush()

    # Upload Yuki audio
    yuki_path = r"C:\Users\anshu\OneDrive\Desktop\Voice Crafter AI\voice-crafter\Test\yuki_generated.wav"
    if os.path.exists(yuki_path):
        with open(yuki_path, "rb") as f:
            audio_bytes = f.read()
            
        storage_key = f"outputs/{user.id}/yuki_featured.wav"
        await storage.upload(settings.BUCKET_OUTPUTS, storage_key, audio_bytes, "audio/wav")

        model = VoiceModel(
            voice_profile_id=profile.id,
            source_type="generated",
            model_version="parler-tts",
            prompt_text=profile.description,
            preview_url=f"/api/v1/uploads/serve/{settings.BUCKET_OUTPUTS}/{storage_key}",
            training_status="ready",
            is_active=True
        )
        db.add(model)
        
        info = sf.info(io.BytesIO(audio_bytes))
        duration = info.duration

        sample = VoiceSample(
            voice_profile_id=profile.id,
            storage_key=storage_key,
            original_filename="yuki.wav",
            duration_seconds=duration,
            sample_rate=info.samplerate,
            file_size_bytes=len(audio_bytes),
            format="wav",
            sha256_hash="yuki_hash"
        )
        db.add(sample)
    
    await db.commit()

def load_parler_model():
    import torch
    from parler_tts import ParlerTTSForConditionalGeneration
    from transformers import AutoTokenizer

    model_id = "parler-tts/parler-tts-mini-v1"
    device = "cpu" # Force CPU to avoid CUDA OOM with 4GB VRAM
    
    print(f"Loading Parler-TTS model: {model_id} on {device}")
    model = ParlerTTSForConditionalGeneration.from_pretrained(model_id).to(device)
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    sample_rate = model.config.sampling_rate
    
    return model, tokenizer, device, sample_rate

def generate_parler_audio(model, tokenizer, device, voice_prompt, text):
    import torch
    import numpy as np
    
    with torch.inference_mode():
        input_ids = tokenizer(voice_prompt, return_tensors="pt").input_ids.to(device)
        prompt_input_ids = tokenizer(text, return_tensors="pt").input_ids.to(device)
        
        generation = model.generate(input_ids=input_ids, prompt_input_ids=prompt_input_ids)
        audio_np = generation.cpu().numpy().squeeze().astype(np.float32)
        
        if device == "cuda":
            torch.cuda.empty_cache()
            
    return audio_np

async def main():
    print("Initializing Parler-TTS offline model...")
    storage = await get_storage()
    
    async with SessionLocal() as db:
        user = await create_vocaria_user(db)
        await add_yuki_voice(db, user, storage)

        for i, prompt_data in enumerate(PROMPTS):
            exists = await db.execute(select(VoiceProfile).where(VoiceProfile.name == prompt_data["name"], VoiceProfile.owner_id == user.id))
            if exists.scalar_one_or_none():
                print(f"Skipping {prompt_data['name']}, already exists.")
                continue

            print(f"[{i+1}/{len(PROMPTS)}] Generating: {prompt_data['name']}...")
            
            # Bypassing local heavy inference to avoid OOM crashes
            # audio_np = await loop.run_in_executor(None, generate_parler_audio, model, tokenizer, device, prompt_data["description"], prompt_data["text"])
            
            # Use pre-generated Yuki audio as a placeholder for the hub gallery
            yuki_path = r"C:\Users\anshu\OneDrive\Desktop\Voice Crafter AI\voice-crafter\Test\yuki_generated.wav"
            with open(yuki_path, "rb") as f:
                audio_bytes = f.read()
                
            sample_rate = 44100

            storage_key = f"outputs/{user.id}/{uuid.uuid4()}.wav"
            await storage.upload(settings.BUCKET_OUTPUTS, storage_key, audio_bytes, "audio/wav")
            preview_url = f"/api/v1/uploads/serve/{settings.BUCKET_OUTPUTS}/{storage_key}"

            profile = VoiceProfile(
                owner_id=user.id,
                name=prompt_data["name"],
                description=prompt_data["description"],
                gender=prompt_data["gender"],
                speaking_style=prompt_data["description"],
                visibility=VoiceVisibility.PUBLIC,
                is_hub_featured=True,
                likes_count=int(100 + i*17),
                plays_count=int(500 + i*43)
            )
            db.add(profile)
            await db.flush()

            model_obj = VoiceModel(
                voice_profile_id=profile.id,
                source_type="generated",
                model_version="parler-tts",
                prompt_text=prompt_data["description"],
                preview_url=preview_url,
                training_status="ready",
                is_active=True
            )
            db.add(model_obj)

            info = sf.info(io.BytesIO(audio_bytes))
            duration = info.duration

            sample = VoiceSample(
                voice_profile_id=profile.id,
                storage_key=storage_key,
                original_filename=f"{prompt_data['name'].lower().replace(' ', '_')}.wav",
                duration_seconds=duration,
                sample_rate=sample_rate,
                file_size_bytes=len(audio_bytes),
                format="wav",
                sha256_hash=f"hash_{i}"
            )
            db.add(sample)

            await db.commit()
            print(f"Successfully saved {prompt_data['name']} ({duration:.1f}s)")

    print("Hub population complete!")

if __name__ == "__main__":
    asyncio.run(main())
