from lib.dynamo import get_table
from lib.response import response


def handler(event, context):
    table = get_table("POSTS_TABLE")
    try:
        result = table.scan()
        posts = [
            {
                "id": item["id"],
                "title": item["title"],
                "summary": item.get("summary", ""),
                "createdAt": item["createdAt"],
            }
            for item in result.get("Items", [])
            if item.get("published")
        ]
        posts.sort(key=lambda p: p["createdAt"], reverse=True)
        return response(200, posts)
    except Exception as err:
        print(f"Error listing posts: {err}")
        return response(500, {"message": "Failed to list posts"})
