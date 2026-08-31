import os
from pydantic import BaseModel

class Settings(BaseModel):
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    S3_ENDPOINT: str = os.getenv("S3_ENDPOINT", "http://localhost:9000")
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "minioadmin")
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "miniopassword")
    S3_BUCKET: str = os.getenv("S3_BUCKET", "cloudvault-media")
    S3_REGION: str = os.getenv("S3_REGION", "us-east-1")
    PORT: int = int(os.getenv("PORT", "8000"))

settings = Settings()
