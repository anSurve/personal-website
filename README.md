# aniketsurve.com — personal website

Static frontend (plain HTML/CSS/JS) on S3, backed by API Gateway + Lambda
(Python) + DynamoDB, defined as infrastructure-as-code with AWS SAM.

## Layout

```
backend/
  template.yaml         SAM template: DynamoDB tables, Lambda functions, API Gateway, S3 bucket
  src/functions/         Python Lambda handlers
    posts_list.py        GET  /posts
    posts_get.py          GET  /posts/{id}
    guestbook_list.py     GET  /guestbook
    guestbook_create.py   POST /guestbook
    lib/                  shared helpers (dynamo client, response formatting)
frontend/
  index.html, css/, js/   home page + shared styles/config
  blog/                   blog list + single post pages
  guestbook/              guestbook form + entries
  apps/                   landing page for small client-side apps (add more here)
scripts/
  add_post.py             admin CLI to write a blog post directly into DynamoDB
```

There is intentionally **no public "create post" endpoint** — posts are added
by you, locally, via `scripts/add_post.py`, using your own AWS credentials.
This keeps the public API surface small (just reads, plus one write for the
guestbook).

## Prerequisites

- An AWS account, with the AWS CLI configured (`aws configure`)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Python 3.12+ (for the Lambda code and the admin script)

## Deploy the backend

`FrontendBucketName` and `CorsAllowOrigin` both have defaults set directly in
`template.yaml`, so no `--parameter-overrides` are needed for a normal
deploy:

```bash
cd backend
sam build
sam deploy --stack-name aniketsurve-website --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3
```

To change the bucket name or lock down CORS, edit the `Default:` values for
`FrontendBucketName` / `CorsAllowOrigin` in `template.yaml` directly, then
redeploy. Note that changing `FrontendBucketName` replaces the S3 bucket —
empty the old one first (`aws s3 rm s3://<old-bucket> --recursive`) so
CloudFormation can delete it during the update.

After it finishes, note the outputs (also available anytime via
`sam list stack-outputs --stack-name <your-stack-name>`):
- `ApiUrl` — paste into `frontend/js/config.js` (`window.API_BASE_URL`)
- `WebsiteURL` — the S3 static website URL
- `PostsTableName` / `GuestbookTableName` — DynamoDB table names

## Deploy the frontend

Update `frontend/js/config.js` with the `ApiUrl` from above, then sync the
files to S3 (run from the repo root):

```bash
aws s3 sync frontend s3://<FrontendBucketNameOutput> --delete
```

Visit the `WebsiteURL` output to see the site live.

Once you know the site's URL, set `CorsAllowOrigin`'s `Default:` in
`template.yaml` to that URL and redeploy to lock the API down to your own
frontend instead of `*`.

> The S3 website endpoint is HTTP-only. For HTTPS and a custom domain, put
> CloudFront + an ACM certificate (+ Route 53, if you buy a domain) in front
> of the bucket later — not required to get the site working.

## Adding blog posts

```bash
POSTS_TABLE=<PostsTableName output> python scripts/add_post.py
```

It prompts for a slug (used as the post's URL id), title, summary, and
content (HTML allowed), then writes it straight into DynamoDB.

## Adding more "apps"

Each app is just a folder under `frontend/apps/` with its own `index.html`
(see `frontend/apps/word-counter/` as a template). Link it from
`frontend/apps/index.html`. Keep them client-side only unless one specifically
needs persistence — then it can call the same API Gateway + add a new
Lambda/table pair in `template.yaml`.

## Guestbook spam mitigation

The form includes a hidden honeypot field (`website`) — real visitors never
fill it in, so the Lambda silently drops submissions that do. If spam becomes
a real problem, add AWS WAF in front of the API or a CAPTCHA to the form.

## Cost

DynamoDB tables use on-demand (`PAY_PER_REQUEST`) billing and Lambda runs on
ARM (cheaper per-ms). For personal-site traffic levels, this comfortably sits
within the AWS free tier.
