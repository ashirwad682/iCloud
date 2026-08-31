from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..image_processing.processor import ImageProcessor
import boto3
from ..config import settings
import io

router = APIRouter(prefix="/api/v1")

class ProcessMediaRequest(BaseModel):
    mediaId: str
    userId: str
    storageKey: str
    mimeType: str
    originalName: str

@router.post("/process-media")
async def process_media(req: ProcessMediaRequest):
    try:
        # S3 client
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        )

        # Download original object
        obj = s3.get_object(Bucket=settings.S3_BUCKET, Key=req.storageKey)
        file_bytes = obj["Body"].read()

        if req.mimeType.startswith("image/"):
            result = ImageProcessor.generate_thumbnails(file_bytes)

            # Upload thumbnail and preview back to S3
            thumb_key = f"users/{req.userId}/media/processed/{req.mediaId}/thumbnail.webp"
            preview_key = f"users/{req.userId}/media/processed/{req.mediaId}/preview.webp"

            s3.put_object(
                Bucket=settings.S3_BUCKET,
                Key=thumb_key,
                Body=result["thumbnail_bytes"],
                ContentType="image/webp",
            )

            s3.put_object(
                Bucket=settings.S3_BUCKET,
                Key=preview_key,
                Body=result["preview_bytes"],
                ContentType="image/webp",
            )

            return {
                "success": True,
                "mediaId": req.mediaId,
                "thumbnailKey": thumb_key,
                "previewKey": preview_key,
                "width": result["width"],
                "height": result["height"],
                "phash": result["phash"],
            }

        return {"success": True, "message": "Video processed"}
    except Exception as e:
        return {"success": False, "error": str(e)}
