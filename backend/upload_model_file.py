import os
from huggingface_hub import HfApi

TOKEN = os.getenv("HF_TOKEN", "")
REPO_ID = "AnshulRathod/vocaria-backend"

api = HfApi(token=TOKEN)

local_file = r"c:\Users\anshu\OneDrive\Desktop\Voice Crafter AI\voice-crafter\backend\app\models\__init__.py"
remote_path = "app/models/__init__.py"

print("Uploading app/models/__init__.py to Hugging Face...")
try:
    api.upload_file(
        path_or_fileobj=local_file,
        path_in_repo=remote_path,
        repo_id=REPO_ID,
        repo_type="space"
    )
    print("Successfully uploaded!")
except Exception as e:
    print(f"Error: {e}")
