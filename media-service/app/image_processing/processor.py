import io
from PIL import Image, ImageOps
import imagehash

class ImageProcessor:
    @staticmethod
    def generate_thumbnails(image_bytes: bytes):
        """
        Generates 300px thumbnail and 1200px preview in WebP format.
        """
        with Image.open(io.BytesIO(image_bytes)) as img:
            img = ImageOps.exif_transpose(img)
            orig_width, orig_height = img.size

            # 1. WebP Thumbnail 300x300 (Cover cropped)
            thumb = ImageOps.fit(img, (300, 300), Image.Resampling.LANCZOS)
            thumb_io = io.BytesIO()
            thumb.save(thumb_io, format="WEBP", quality=80)
            thumb_bytes = thumb_io.getvalue()

            # 2. WebP Preview 1200px (Contain fit)
            preview = img.copy()
            preview.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
            preview_io = io.BytesIO()
            preview.save(preview_io, format="WEBP", quality=85)
            preview_bytes = preview_io.getvalue()

            # 3. Perceptual Hash
            phash = str(imagehash.phash(img))

            return {
                "thumbnail_bytes": thumb_bytes,
                "preview_bytes": preview_bytes,
                "width": orig_width,
                "height": orig_height,
                "aspect_ratio": round(orig_width / orig_height, 2) if orig_height else 1.0,
                "phash": phash,
            }
