import json
import os
import re

import boto3

from lib.auth import check_password
from lib.response import response

SONGS_PREFIX = "songs/"
UPLOAD_EXPIRES_SECONDS = 300


def slugify(text):
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "track"


def handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "Invalid JSON"})

    if not check_password(body.get("password", "")):
        return response(403, {"message": "Incorrect password"})

    title = (body.get("title") or "").strip()
    filename = (body.get("filename") or "").strip()
    content_type = body.get("contentType") or "audio/mpeg"
    cover_filename = (body.get("coverFilename") or "").strip()
    cover_content_type = body.get("coverContentType") or "image/jpeg"

    if not title or not filename:
        return response(400, {"message": "Title and filename are required"})

    slug = slugify(title)
    ext = os.path.splitext(filename)[1] or ".mp3"
    audio_key = f"{SONGS_PREFIX}{slug}{ext}"

    bucket = os.environ["FRONTEND_BUCKET"]
    s3 = boto3.client("s3")

    result = {
        "slug": slug,
        "audioKey": audio_key,
        "audioUploadUrl": s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": bucket, "Key": audio_key, "ContentType": content_type},
            ExpiresIn=UPLOAD_EXPIRES_SECONDS,
        ),
    }

    if cover_filename:
        cover_ext = os.path.splitext(cover_filename)[1] or ".jpg"
        cover_key = f"{SONGS_PREFIX}covers/{slug}{cover_ext}"
        result["coverKey"] = cover_key
        result["coverUploadUrl"] = s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": bucket, "Key": cover_key, "ContentType": cover_content_type},
            ExpiresIn=UPLOAD_EXPIRES_SECONDS,
        )

    return response(200, result)
