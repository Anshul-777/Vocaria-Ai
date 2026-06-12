import os
from pathlib import Path

outputs_dir = Path("C:/Users/anshu/OneDrive/Desktop/Voice Crafter AI/voice-crafter/backend/storage/vc-outputs/outputs")
if outputs_dir.exists():
    files = list(outputs_dir.glob("*"))
    print(f"Found {len(files)} files in outputs directory.")
    for f in files[:5]:
        print(f.name, f.stat().st_mtime)
else:
    print("outputs directory does not exist")
