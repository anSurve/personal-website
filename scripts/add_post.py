#!/usr/bin/env python3
"""Add or update a blog post directly in DynamoDB.

There is no public "create post" API endpoint on purpose (smaller attack
surface for a personal blog). Run this locally with your AWS credentials
instead:

    POSTS_TABLE=<stack-name>-posts python scripts/add_post.py

Find the table name from `sam list stack-outputs --stack-name <name>`
(output key: PostsTableName).
"""
import os
import sys
from datetime import datetime, timezone

import boto3


def main():
    table_name = os.environ.get("POSTS_TABLE")
    if not table_name:
        print("Set POSTS_TABLE to your posts table name (see stack outputs).")
        sys.exit(1)

    slug = input("Slug (used as URL id, e.g. my-first-post): ").strip()
    title = input("Title: ").strip()
    summary = input("Summary (1-2 sentences): ").strip()

    print("Paste the post content (HTML allowed). End with a line containing only EOF:")
    lines = []
    while True:
        line = input()
        if line == "EOF":
            break
        lines.append(line)
    content = "\n".join(lines).strip()

    if not slug or not title:
        print("Slug and title are required.")
        sys.exit(1)

    table = boto3.resource("dynamodb").Table(table_name)
    table.put_item(
        Item={
            "id": slug,
            "title": title,
            "summary": summary,
            "content": content,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "published": True,
        }
    )
    print(f'Saved post "{title}" with id "{slug}".')


if __name__ == "__main__":
    main()
