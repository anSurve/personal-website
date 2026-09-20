from lib.dynamo import get_table
from lib.response import response


def handler(event, context):
    table = get_table("GUESTBOOK_TABLE")
    try:
        result = table.scan()
        entries = sorted(
            result.get("Items", []), key=lambda e: e["createdAt"], reverse=True
        )[:50]
        entries = [
            {
                "id": e["id"],
                "name": e["name"],
                "message": e["message"],
                "createdAt": e["createdAt"],
            }
            for e in entries
        ]
        return response(200, entries)
    except Exception as err:
        print(f"Error listing guestbook entries: {err}")
        return response(500, {"message": "Failed to list guestbook entries"})
