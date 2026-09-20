from lib.dynamo import get_table
from lib.response import response


def handler(event, context):
    post_id = (event.get("pathParameters") or {}).get("id")
    if not post_id:
        return response(400, {"message": "Missing post id"})

    table = get_table("POSTS_TABLE")
    try:
        result = table.get_item(Key={"id": post_id})
        item = result.get("Item")
        if not item or not item.get("published"):
            return response(404, {"message": "Post not found"})
        return response(200, item)
    except Exception as err:
        print(f"Error getting post {post_id}: {err}")
        return response(500, {"message": "Failed to get post"})
