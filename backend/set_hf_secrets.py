import os
from huggingface_hub import HfApi

TOKEN = os.getenv("HF_TOKEN", "")
REPO_ID = "AnshulRathod/vocaria-backend"

api = HfApi(token=TOKEN)

# Load local env vars
secrets = {}
with open(".env", "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, val = line.split("=", 1)
            secrets[key] = val

# Variables to set
keys_to_set = [
    "SUPABASE_URL", "SUPABASE_SERVICE_KEY", "SUPABASE_ANON_KEY",
    "STORAGE_BACKEND", "GEMINI_API_KEY", "GROQ_API_KEY", "SECRET_KEY", "CORS_ORIGINS",
    "DATABASE_URL", "REDIS_URL", "SUPABASE_JWT_SECRET"
]

print("Setting secrets on Hugging Face...")
for key in keys_to_set:
    if key in secrets:
        print(f"Adding secret: {key}")
        try:
            api.add_space_secret(repo_id=REPO_ID, key=key, value=secrets[key])
        except Exception as e:
            print(f"Failed to set {key}: {e}")

print("Done setting secrets.")
