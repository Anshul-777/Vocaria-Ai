import asyncio
import os
import mimetypes
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(".env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    exit(1)

supabase: Client = create_client(url, key)
storage_dir = Path("./storage")

async def migrate():
    if not storage_dir.exists():
        print("Local storage directory does not exist. Nothing to migrate.")
        return

    # Ensure buckets exist
    buckets = ["vc-voices", "vc-samples", "vc-outputs", "vc-uploads", "vc-evidence", "vc-exports"]
    
    existing = supabase.storage.list_buckets()
    existing_names = [b.name for b in existing]
    
    for b in buckets:
        if b not in existing_names:
            try:
                supabase.storage.create_bucket(b, name=b, options={'public': False})
                print(f"Created bucket {b}")
            except Exception as e:
                print(f"Failed to create bucket {b}: {e}")

    # Upload files
    total_files = 0
    uploaded_files = 0

    for bucket_dir in storage_dir.iterdir():
        if bucket_dir.is_dir() and bucket_dir.name in buckets:
            bucket_name = bucket_dir.name
            for file_path in bucket_dir.rglob("*"):
                if file_path.is_file():
                    total_files += 1
                    # Get relative key (e.g. "uuid.wav")
                    key = str(file_path.relative_to(bucket_dir)).replace("\\", "/")
                    
                    content_type, _ = mimetypes.guess_type(file_path)
                    if not content_type:
                        content_type = "application/octet-stream"

                    print(f"Uploading {bucket_name}/{key}...")
                    
                    try:
                        with open(file_path, "rb") as f:
                            data = f.read()
                        
                        supabase.storage.from_(bucket_name).upload(
                            file=data, 
                            path=key, 
                            file_options={"content-type": content_type, "upsert": "true"}
                        )
                        uploaded_files += 1
                    except Exception as e:
                        print(f"Error uploading {key}: {e}")

    print(f"\nMigration complete! Uploaded {uploaded_files}/{total_files} files.")

if __name__ == "__main__":
    asyncio.run(migrate())
