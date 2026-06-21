"""
Vocaria Storage Backend
Supports MinIO (S3-compatible), AWS S3, and local filesystem.
"""
import asyncio, io, logging, os, shutil
from pathlib import Path
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)
_storage_instance = None


class StorageBackend:
    def __init__(self):
        self.backend = settings.STORAGE_BACKEND
        self._client = None
        self._supabase = None
        if self.backend == "local":
            self._base = Path(settings.LOCAL_STORAGE_PATH)
            self._base.mkdir(parents=True, exist_ok=True)

    def _get_supabase_client(self):
        if self._supabase:
            return self._supabase
        from supabase import create_client
        self._supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        return self._supabase

    def _get_minio_client(self):
        if self._client:
            return self._client
        from minio import Minio
        self._client = Minio(
            settings.STORAGE_ENDPOINT,
            access_key=settings.STORAGE_ACCESS_KEY,
            secret_key=settings.STORAGE_SECRET_KEY,
            secure=settings.STORAGE_SECURE,
        )
        return self._client

    async def ensure_buckets(self):
        buckets = [
            settings.BUCKET_VOICES, settings.BUCKET_SAMPLES,
            settings.BUCKET_OUTPUTS, settings.BUCKET_UPLOADS,
            settings.BUCKET_EVIDENCE, settings.BUCKET_EXPORTS,
        ]
        if self.backend == "local":
            for b in buckets:
                (self._base / b).mkdir(parents=True, exist_ok=True)
            return
        if self.backend == "supabase":
            client = self._get_supabase_client()
            loop = asyncio.get_event_loop()
            existing = await loop.run_in_executor(None, client.storage.list_buckets)
            existing_names = [b.name for b in existing]
            for b in buckets:
                if b not in existing_names:
                    try:
                        await loop.run_in_executor(None, lambda: client.storage.create_bucket(b, name=b, options={'public': False}))
                        logger.info(f"Created Supabase bucket: {b}")
                    except Exception as e:
                        logger.warning(f"Failed to create Supabase bucket {b}: {e}")
            return
            
        loop = asyncio.get_event_loop()
        client = self._get_minio_client()
        for b in buckets:
            try:
                exists = await loop.run_in_executor(None, client.bucket_exists, b)
                if not exists:
                    await loop.run_in_executor(None, client.make_bucket, b)
                    logger.info(f"Created bucket: {b}")
            except Exception as e:
                logger.warning(f"Bucket {b} check error: {e}")

    async def upload(self, bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        if self.backend == "local":
            dest = self._base / bucket / key
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            return key
        if self.backend == "supabase":
            client = self._get_supabase_client()
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: client.storage.from_(bucket).upload(
                    file=data, path=key, file_options={"content-type": content_type, "upsert": "true"}
                )
            )
            return key
            
        loop = asyncio.get_event_loop()
        client = self._get_minio_client()
        buf = io.BytesIO(data)
        await loop.run_in_executor(
            None,
            lambda: client.put_object(bucket, key, buf, len(data), content_type=content_type)
        )
        return key

    async def download(self, bucket: str, key: str) -> bytes:
        if self.backend == "local":
            return (self._base / bucket / key).read_bytes()
        if self.backend == "supabase":
            client = self._get_supabase_client()
            loop = asyncio.get_event_loop()
            res = await loop.run_in_executor(None, lambda: client.storage.from_(bucket).download(key))
            return res
            
        loop = asyncio.get_event_loop()
        client = self._get_minio_client()
        response = await loop.run_in_executor(None, client.get_object, bucket, key)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    async def delete(self, bucket: str, key: str):
        if self.backend == "local":
            p = self._base / bucket / key
            if p.exists():
                p.unlink()
            return
        if self.backend == "supabase":
            client = self._get_supabase_client()
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: client.storage.from_(bucket).remove([key]))
            return
            
        loop = asyncio.get_event_loop()
        client = self._get_minio_client()
        await loop.run_in_executor(None, client.remove_object, bucket, key)

    async def presigned_url(self, bucket: str, key: str, expires_hours: int = 1) -> str:
        if self.backend == "local":
            return f"/api/v1/uploads/serve/{bucket}/{key}"
        if self.backend == "supabase":
            client = self._get_supabase_client()
            loop = asyncio.get_event_loop()
            res = await loop.run_in_executor(
                None, 
                lambda: client.storage.from_(bucket).create_signed_url(key, expires_hours * 3600)
            )
            return res.get("signedURL")
            
        from datetime import timedelta
        loop = asyncio.get_event_loop()
        client = self._get_minio_client()
        url = await loop.run_in_executor(
            None,
            lambda: client.presigned_get_object(bucket, key, expires=timedelta(hours=expires_hours))
        )
        return url

    async def health_check(self) -> bool:
        try:
            if self.backend == "local":
                return self._base.exists()
            if self.backend == "supabase":
                client = self._get_supabase_client()
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, client.storage.list_buckets)
                return True
            client = self._get_minio_client()
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, client.list_buckets)
            return True
        except Exception:
            return False


async def get_storage() -> StorageBackend:
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = StorageBackend()
        await _storage_instance.ensure_buckets()
    return _storage_instance
