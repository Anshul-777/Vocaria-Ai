import asyncio
import os
import sys
import argparse
import json

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.ml.detection_pipeline import get_detection_pipeline

async def main():
    parser = argparse.ArgumentParser(description="Test Audio Detection Pipeline")
    parser.add_argument("--file", type=str, help="Path to an audio file to test", required=True)
    args = parser.parse_args()

    file_path = args.file
    
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        sys.exit(1)

    print(f"Loading Detection Pipeline and analyzing {file_path}...")
    pipeline = get_detection_pipeline()
    
    # Run the full file analysis
    try:
        results = await pipeline.analyze_full_file(file_path)
        print("\n--- Analysis Results ---")
        print(json.dumps(results, indent=2))
        
    except Exception as e:
        print(f"\nError during analysis: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
