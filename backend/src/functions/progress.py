import json
import re
from datetime import datetime, timezone

from lib.dynamo import get_table
from lib.response import response

# Apps allowed to store progress, and the shape of what they may store.
APPS = {"agentic-ai"}
ITEM_ID = re.compile(r"^[a-z0-9-]{1,40}$")
MAX_VISITED = 100


def _user_id(event):
    # Set by the API Gateway Cognito authorizer from the verified ID token;
    # requests without a valid token never reach this function.
    claims = ((event.get("requestContext") or {}).get("authorizer") or {}).get("claims") or {}
    return claims.get("sub")


def _as_output(item):
    best = item.get("quizBest")
    return {
        "visited": sorted(item.get("visited") or []),
        "quizBest": int(best) if best is not None else None,
        "updatedAt": item.get("updatedAt"),
    }


def handler(event, context):
    user_id = _user_id(event)
    if not user_id:
        return response(401, {"message": "Sign in required"})

    app = (event.get("pathParameters") or {}).get("app", "")
    if app not in APPS:
        return response(404, {"message": "Unknown app"})

    table = get_table("PROGRESS_TABLE")
    key = {"userId": user_id, "app": app}
    try:
        current = table.get_item(Key=key).get("Item") or {}
    except Exception as err:
        print(f"Error reading progress: {err}")
        return response(500, {"message": "Failed to load progress"})

    if event.get("httpMethod") == "GET":
        return response(200, _as_output(current))

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "Invalid JSON"})

    visited = body.get("visited") or []
    if not isinstance(visited, list) or not all(isinstance(v, str) and ITEM_ID.match(v) for v in visited):
        return response(400, {"message": "visited must be a list of lesson ids"})
    quiz_best = body.get("quizBest")
    if quiz_best is not None and (not isinstance(quiz_best, int) or isinstance(quiz_best, bool) or not 0 <= quiz_best <= 100):
        return response(400, {"message": "quizBest must be an integer from 0 to 100"})

    # Merge rather than overwrite, so two devices syncing at once never lose progress.
    merged = set(current.get("visited") or []) | set(visited)
    if len(merged) > MAX_VISITED:
        return response(400, {"message": "Too many lessons"})
    stored_best = current.get("quizBest")
    candidates = [int(b) for b in (stored_best, quiz_best) if b is not None]

    item = {
        **key,
        "visited": sorted(merged),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    if candidates:
        item["quizBest"] = max(candidates)

    try:
        table.put_item(Item=item)
    except Exception as err:
        print(f"Error saving progress: {err}")
        return response(500, {"message": "Failed to save progress"})
    return response(200, _as_output(item))
