import json
import os

import boto3
from botocore.exceptions import ClientError

from lib.auth import check_password
from lib.response import response

MANIFEST_KEY = "songs/manifest.json"


def load_manifest(s3, bucket):
    try:
        obj = s3.get_object(Bucket=bucket, Key=MANIFEST_KEY)
        return json.loads(obj["Body"].read())
    except ClientError as err:
        if err.response["Error"]["Code"] in ("NoSuchKey", "404"):
            return []
        raise


def handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "Invalid JSON"})

    if not check_password(body.get("password", "")):
        return response(403, {"message": "Incorrect password"})

    slug = (body.get("slug") or "").strip()
    title = (body.get("title") or "").strip()
    artist = (body.get("artist") or "").strip()
    audio_key = (body.get("audioKey") or "").strip()
    cover_key = body.get("coverKey") or None

    if not slug or not title or not audio_key:
        return response(400, {"message": "slug, title, and audioKey are required"})

    bucket = os.environ["FRONTEND_BUCKET"]
    s3 = boto3.client("s3")

    manifest = load_manifest(s3, bucket)
    manifest = [song for song in manifest if song.get("id") != slug]
    entry = {"id": slug, "title": title, "artist": artist, "file": audio_key, "cover": cover_key}
    manifest.append(entry)

    s3.put_object(
        Bucket=bucket,
        Key=MANIFEST_KEY,
        Body=json.dumps(manifest, indent=2).encode("utf-8"),
        ContentType="application/json",
    )

    return response(201, entry)
