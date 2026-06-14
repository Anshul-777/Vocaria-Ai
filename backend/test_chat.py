import httpx
import asyncio

async def run():
    # Login first
    async with httpx.AsyncClient() as client:
        # Get token
        resp = await client.post("http://localhost:8000/api/v1/auth/login", data={"username": "testuser", "password": "password123"})
        if resp.status_code != 200:
            print("Login failed, skipping chat test. Instead, testing just the model via /users/me.")
            # Let's create a user
            resp = await client.post("http://localhost:8000/api/v1/auth/register", json={"email": "test@test.com", "username": "testuser", "password": "password123", "full_name": "Test User"})
            resp = await client.post("http://localhost:8000/api/v1/auth/login", data={"username": "testuser", "password": "password123"})
        
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # We need a voice profile id
        resp = await client.get("http://localhost:8000/api/v1/voices/", headers=headers)
        voices = resp.json().get("voices", [])
        if not voices:
            # Create one
            resp = await client.post("http://localhost:8000/api/v1/voices/", headers=headers, json={"name": "test", "description": "test", "is_synthetic": True, "gender": "male", "tags": []})
            voice_id = resp.json()["id"]
        else:
            voice_id = voices[0]["id"]
            
        # Test chat
        payload = {
            "voice_profile_id": voice_id,
            "message": "hello",
            "mode": "default",
            "history": []
        }
        resp = await client.post("http://localhost:8000/api/v1/agent/chat", headers=headers, json=payload)
        print("Status code:", resp.status_code)
        print("Response:", resp.text)

asyncio.run(run())
