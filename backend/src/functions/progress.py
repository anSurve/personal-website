import json
import re
from datetime import datetime, timezone

from lib.dynamo import get_table
from lib.response import response

# Apps allowed to store progress. Each has its own shape:
#   agentic-ai: lessons visited + best quiz score (only ever grows)
#   fde-plan:   16-week interview plan; an enrollment date plus a map of
#               completed day ids -> when they were marked done (days can be
#               un-marked, so changes are applied per item, not unioned)
#   fde-jobs:   the plan's job-search tracker; a list of job records, edited
#               one record at a time (upsert / delete by id)
APPS = {"agentic-ai", "fde-plan", "fde-jobs"}
ITEM_ID = re.compile(r"^[a-z0-9-]{1,40}$")
MAX_VISITED = 100

PLAN_DAYS = ("sun", "mon", "tue", "wed", "thu", "fri", "sat")
PLAN_DAY_IDS = [f"w{w}-{d}" for w in range(1, 17) for d in PLAN_DAYS]  # one per day of the plan
PLAN_ITEMS = frozenset(
    PLAN_DAY_IDS
    + [f"{day}-o{n}" for day in PLAN_DAY_IDS for n in range(1, 20)]  # a day guide's objectives
    + [f"h1b-{i}" for i in range(1, 6)]  # Appendix B checklist
)


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


# Job tracker records: field -> max length for free text
JOB_TEXT = {"company": 80, "role": 120, "link": 500, "referral": 120, "nextStep": 200, "notes": 2000}
JOB_STATUSES = {"planned", "applied", "interviewing", "offer", "rejected", "withdrawn"}
JOB_TRISTATE = {"yes", "no", "unknown"}
JOB_ID = re.compile(r"^[a-z0-9]{6,24}$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MAX_JOBS = 300
MAX_UPSERT = 50


def _clean_job(job):
    """Validate one job record from the client; returns the record to store."""
    if not isinstance(job, dict):
        raise ValueError("each job must be an object")
    if not isinstance(job.get("id"), str) or not JOB_ID.match(job["id"]):
        raise ValueError("job id must be 6-24 lowercase letters or digits")
    out = {"id": job["id"]}
    for field, limit in JOB_TEXT.items():
        value = job.get(field, "")
        if not isinstance(value, str) or len(value.strip()) > limit:
            raise ValueError(f"{field} must be text of at most {limit} characters")
        out[field] = value.strip()
    if not out["company"]:
        raise ValueError("company is required")
    if out["link"] and not out["link"].startswith(("https://", "http://")):
        raise ValueError("link must start with http:// or https://")
    tier = job.get("tier")
    if isinstance(tier, bool) or tier not in (1, 2, 3):
        raise ValueError("tier must be 1, 2 or 3")
    out["tier"] = tier
    if job.get("status") not in JOB_STATUSES:
        raise ValueError("unknown status")
    out["status"] = job["status"]
    for field in ("nycOffice", "h1b"):
        value = job.get(field, "unknown")
        if value not in JOB_TRISTATE:
            raise ValueError(f"{field} must be yes, no or unknown")
        out[field] = value
    for field in ("appliedOn", "nextDate"):
        value = job.get(field, "")
        if not isinstance(value, str) or (value and not ISO_DATE.match(value)):
            raise ValueError(f"{field} must be a YYYY-MM-DD date")
        out[field] = value
    return out


def _jobs_output(item):
    jobs = [{**j, "tier": int(j["tier"])} for j in item.get("jobs") or []]  # DynamoDB returns Decimals
    return {"jobs": jobs, "updatedAt": item.get("updatedAt")}


def _jobs(event, table, key):
    def load():
        return table.get_item(Key=key).get("Item") or {}

    if event.get("httpMethod") == "GET":
        try:
            return response(200, _jobs_output(load()))
        except Exception as err:
            print(f"Error reading jobs: {err}")
            return response(500, {"message": "Failed to load jobs"})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "Invalid JSON"})
    if not isinstance(body, dict):
        return response(400, {"message": "Body must be an object"})

    upserts = body.get("upsert") or []
    if isinstance(upserts, dict):
        upserts = [upserts]
    delete_id = body.get("delete")
    try:
        if not isinstance(upserts, list) or len(upserts) > MAX_UPSERT:
            raise ValueError(f"upsert must be a job or a list of at most {MAX_UPSERT} jobs")
        upserts = [_clean_job(j) for j in upserts]
        if delete_id is not None and (not isinstance(delete_id, str) or not JOB_ID.match(delete_id)):
            raise ValueError("delete must be a job id")
    except ValueError as err:
        return response(400, {"message": str(err)})

    # Read-modify-write guarded by a version number, so two devices saving at
    # the same moment can't overwrite each other's records.
    for _ in range(3):
        try:
            current = load()
        except Exception as err:
            print(f"Error reading jobs: {err}")
            return response(500, {"message": "Failed to load jobs"})
        jobs = {j["id"]: j for j in current.get("jobs") or []}
        for job in upserts:
            jobs[job["id"]] = job
        if delete_id:
            jobs.pop(delete_id, None)
        if len(jobs) > MAX_JOBS:
            return response(400, {"message": f"At most {MAX_JOBS} jobs"})
        version = int(current.get("version", 0))
        item = {**key, "jobs": list(jobs.values()), "version": version + 1, "updatedAt": _now()}
        try:
            table.put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(userId) OR version = :v",
                ExpressionAttributeValues={":v": version},
            )
            return response(200, _jobs_output(item))
        except Exception as err:
            if getattr(err, "response", {}).get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                continue  # someone else saved first: re-read and apply again
            print(f"Error saving jobs: {err}")
            return response(500, {"message": "Failed to save jobs"})
    return response(409, {"message": "Too many simultaneous changes; please retry"})


def _now():
    return datetime.now(timezone.utc).isoformat()


def _plan_output(item):
    return {
        "enrolledAt": item.get("enrolledAt"),
        "done": dict(item.get("done") or {}),
        "updatedAt": item.get("updatedAt"),
    }


def _plan(event, table, key, current):
    if event.get("httpMethod") == "GET":
        return response(200, _plan_output(current))

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "Invalid JSON"})
    if not isinstance(body, dict):
        return response(400, {"message": "Body must be an object"})

    if body.get("leave") is True:
        try:
            table.delete_item(Key=key)
        except Exception as err:
            print(f"Error leaving plan: {err}")
            return response(500, {"message": "Failed to leave the plan"})
        return response(200, _plan_output({}))

    changes = body.get("changes") or {}
    if (
        not isinstance(changes, dict)
        or not all(k in PLAN_ITEMS and isinstance(v, bool) for k, v in changes.items())
    ):
        return response(400, {"message": "changes must map plan day ids to true/false"})
    if not current.get("enrolledAt") and body.get("enroll") is not True:
        return response(409, {"message": "Enroll in the plan first"})

    now = _now()
    done = dict(current.get("done") or {})
    for item_id, is_done in changes.items():
        if is_done:
            done.setdefault(item_id, now)  # keep the first time it was marked done
        else:
            done.pop(item_id, None)

    item = {**key, "enrolledAt": current.get("enrolledAt") or now, "done": done, "updatedAt": now}
    try:
        table.put_item(Item=item)
    except Exception as err:
        print(f"Error saving plan progress: {err}")
        return response(500, {"message": "Failed to save progress"})
    return response(200, _plan_output(item))


def handler(event, context):
    user_id = _user_id(event)
    if not user_id:
        return response(401, {"message": "Sign in required"})

    app = (event.get("pathParameters") or {}).get("app", "")
    if app not in APPS:
        return response(404, {"message": "Unknown app"})

    table = get_table("PROGRESS_TABLE")
    key = {"userId": user_id, "app": app}
    if app == "fde-jobs":
        return _jobs(event, table, key)
    try:
        current = table.get_item(Key=key).get("Item") or {}
    except Exception as err:
        print(f"Error reading progress: {err}")
        return response(500, {"message": "Failed to load progress"})

    if app == "fde-plan":
        return _plan(event, table, key, current)

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
        "updatedAt": _now(),
    }
    if candidates:
        item["quizBest"] = max(candidates)

    try:
        table.put_item(Item=item)
    except Exception as err:
        print(f"Error saving progress: {err}")
        return response(500, {"message": "Failed to save progress"})
    return response(200, _as_output(item))
