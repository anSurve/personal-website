import json
import uuid
from datetime import datetime, timezone

from lib.dynamo import get_table
from lib.response import response

MAX_NAME_LENGTH = 50
MAX_MESSAGE_LENGTH = 500


def handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "Invalid JSON"})

    # Honeypot field: real visitors never fill this in, bots usually do.
    # Pretend success so bots don't learn to avoid it, but skip the write.
    if body.get("website"):
        return response(201, {"message": "Thanks!"})

    name = (body.get("name") or "").strip()[:MAX_NAME_LENGTH]
    message = (body.get("message") or "").strip()[:MAX_MESSAGE_LENGTH]

    if not name or not message:
        return response(400, {"message": "Name and message are required"})

    item = {
        "id": str(uuid.uuid4()),
        "name": name,
        "message": message,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    table = get_table("GUESTBOOK_TABLE")
    try:
        table.put_item(Item=item)
        return response(201, item)
    except Exception as err:
        print(f"Error saving guestbook entry: {err}")
        return response(500, {"message": "Failed to save entry"})
