#!/usr/bin/env python3
"""Upload a song to S3 and register it in songs/manifest.json.

There is no public "upload song" endpoint on purpose (same reasoning as
add_post.py). Run this locally with your AWS credentials instead:

    FRONTEND_BUCKET=<bucket name> python scripts/add_song.py

Find the bucket name from `sam list stack-outputs --stack-name <name>`
(output key: FrontendBucketNameOutput).
"""
import json
import mimetypes
import os
import re
import sys

import boto3
from botocore.exceptions import ClientError

SONGS_PREFIX = "songs/"
MANIFEST_KEY = "songs/manifest.json"


def slugify(text):
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "track"


def load_manifest(s3, bucket):
    try:
        obj = s3.get_object(Bucket=bucket, Key=MANIFEST_KEY)
        return json.loads(obj["Body"].read())
    except ClientError as err:
        if err.response["Error"]["Code"] in ("NoSuchKey", "404"):
            return []
        raise


def upload_file(s3, bucket, local_path, key):
    content_type = mimetypes.guess_type(local_path)[0] or "application/octet-stream"
    s3.upload_file(local_path, bucket, key, ExtraArgs={"ContentType": content_type})


def main():
    bucket = os.environ.get("FRONTEND_BUCKET")
    if not bucket:
        print("Set FRONTEND_BUCKET to your frontend bucket name (see stack outputs).")
        sys.exit(1)

    audio_path = input("Path to audio file (mp3/m4a/wav): ").strip().strip('"')
    if not os.path.isfile(audio_path):
        print(f"File not found: {audio_path}")
        sys.exit(1)

    title = input("Title: ").strip()
    artist = input("Artist: ").strip()
    cover_path = input("Path to cover image (optional, press Enter to skip): ").strip().strip('"')

    if not title:
        print("Title is required.")
        sys.exit(1)

    slug = slugify(title)
    ext = os.path.splitext(audio_path)[1] or ".mp3"
    audio_key = f"{SONGS_PREFIX}{slug}{ext}"

    cover_key = None
    if cover_path:
        if not os.path.isfile(cover_path):
            print(f"Cover file not found, skipping: {cover_path}")
        else:
            cover_ext = os.path.splitext(cover_path)[1] or ".jpg"
            cover_key = f"{SONGS_PREFIX}covers/{slug}{cover_ext}"

    s3 = boto3.client("s3")

    print(f"Uploading audio to s3://{bucket}/{audio_key} ...")
    upload_file(s3, bucket, audio_path, audio_key)

    if cover_key:
        print(f"Uploading cover to s3://{bucket}/{cover_key} ...")
        upload_file(s3, bucket, cover_path, cover_key)

    manifest = load_manifest(s3, bucket)
    manifest = [song for song in manifest if song.get("id") != slug]
    manifest.append(
        {
            "id": slug,
            "title": title,
            "artist": artist,
            "file": audio_key,
            "cover": cover_key,
        }
    )

    s3.put_object(
        Bucket=bucket,
        Key=MANIFEST_KEY,
        Body=json.dumps(manifest, indent=2).encode("utf-8"),
        ContentType="application/json",
    )

    print(f'Added "{title}" by {artist or "Unknown"} (id: {slug}).')


if __name__ == "__main__":
    main()
