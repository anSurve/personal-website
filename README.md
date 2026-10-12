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
    songs_upload_url.py   POST /songs/upload-url (password-gated, returns presigned S3 PUT URLs)
    songs_confirm.py      POST /songs/confirm    (password-gated, updates songs/manifest.json)
    lib/                  shared helpers (dynamo client, response formatting, password check)
frontend/
  index.html, css/, js/   home page + shared styles/config
  blog/                   blog list + single post pages
  guestbook/              guestbook form + entries
  apps/                   landing page for small client-side apps (add more here)
    astrology/            Janma Kundali: Vedic birth chart + readings, computed in-browser
    anatomy/              3D bones + muscles explorer (three.js, BodyParts3D models)
    circulation/          3D heart, arteries, veins + hormone routes (reuses anatomy's bones.glb)
scripts/
  add_post.py             admin CLI to write a blog post directly into DynamoDB
  add_song.py             admin CLI to upload a song to S3 and update songs/manifest.json
  anatomy/                rebuild the anatomy app's models from BodyParts3D
  circulation/            rebuild the circulation app's models from BodyParts3D
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
aws s3 sync frontend s3://<FrontendBucketNameOutput> --delete --exclude "songs/*"
```

> **Always include `--exclude "songs/*"`.** Songs and `manifest.json` live
> directly in the bucket, not in the local `frontend/` folder — a sync with
> `--delete` and no exclude will wipe them, since as far as `aws s3 sync` is
> concerned they're "extra" files that don't exist locally.

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

## Human Anatomy app

`frontend/apps/anatomy/` renders the bones and muscles of
[BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/) (CC BY 4.0,
credited on the page) with three.js loaded from a CDN. Everything it needs is
committed: `models/bones.glb` and `models/muscles.glb` (~4 MB, meshopt
compressed, one mesh per structure named by its FMA id), `parts.json` (name,
side, region, kind per mesh) and `info.js` (origin/insertion/action/nerve or
description/joints/notes per structure).

To regenerate the models (e.g. with more or less detail), download
`isa_BP3D_4.0_obj_99.zip` plus the `isa_*` and `partof_*` index files from the
BodyParts3D site into one folder, then:

```bash
pip install numpy fast-simplification trimesh
python scripts/anatomy/catalog.py <data-dir> catalog.json
python scripts/anatomy/build_meshes.py <data-dir>/isa_BP3D_4.0_obj_99.zip catalog.json <out-dir> 0.25 0.25
npx @gltf-transform/cli@4.1.1 meshopt <out-dir>/bones.raw.glb frontend/apps/anatomy/models/bones.glb
npx @gltf-transform/cli@4.1.1 meshopt <out-dir>/muscles.raw.glb frontend/apps/anatomy/models/muscles.glb
```

`parts.json` is `catalog.json` with the element lists dropped and keys
shortened (`id n b w s c r k`). The last two arguments of `build_meshes.py`
are the fraction of triangles kept for bones and muscles.

## Circulation app

`frontend/apps/circulation/` is a sister app to Human Anatomy: arteries,
veins, heart, hormone glands and context organs from BodyParts3D, plus
step-by-step hormone routes (`routes.js`). It shares `../anatomy/anatomy.css`
and loads `../anatomy/models/bones.glb` as a faint skeleton, so the two apps
must be built in the same coordinate frame (the constants at the top of
`scripts/circulation/build_meshes.py`). Rebuild with the same data folder:

```bash
python scripts/circulation/catalog.py <data-dir> vcatalog.json
python scripts/circulation/build_meshes.py <data-dir>/isa_BP3D_4.0_obj_99.zip vcatalog.json <out-dir> frontend/apps/circulation/parts.json
for f in arteries veins organs; do npx @gltf-transform/cli@4.1.1 meshopt <out-dir>/$f.raw.glb frontend/apps/circulation/models/$f.glb; done
```

Route steps reference structures by name (`"renal vein~left"`), so check
`routes.js` still resolves after a rebuild.

## Music player

`frontend/apps/music/` plays songs stored under `songs/` in the same frontend
bucket (already publicly readable via the existing bucket policy), described
by `songs/manifest.json`:

```json
[
  { "id": "song-slug", "title": "Song Title", "artist": "Artist", "file": "songs/song-slug.mp3", "cover": "songs/covers/song-slug.jpg" }
]
```

The player fetches that manifest and streams each file's `src` directly from
the same origin (the S3 website endpoint) — no CORS setup needed for
*playback*.

There are two ways to add a song:

**1. The "+ Add Song" button** on the music page links to `apps/music/add.html`,
a password-gated upload form. Selecting an audio file reads its ID3 tags
client-side (via [jsmediatags](https://github.com/aadsm/jsmediatags), loaded
from a CDN) and auto-fills Title/Artist and pulls any embedded cover art —
without overwriting fields you've already typed, and a manually chosen cover
image always overrides the embedded one. On submit, the browser calls
`POST /songs/upload-url` (Lambda checks the password, returns short-lived
presigned S3 PUT URLs), uploads the audio/cover straight to S3 using those
URLs, then calls `POST /songs/confirm` (password checked again) to append the
entry to `manifest.json`. No AWS credentials ever touch the browser.

To set the password, generate a SHA-256 hash and pass it at deploy time —
**never commit the real hash to `template.yaml`'s `Default:`, since this repo
is public**:

```bash
python -c "import hashlib, getpass; print(hashlib.sha256(getpass.getpass().encode()).hexdigest())"
sam deploy --stack-name aniketsurve-website --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3 \
  --parameter-overrides SongsUploadPasswordHash=<hash from above>
```

Leaving `SongsUploadPasswordHash` unset (its default is `""`) disables the
button's backend — both endpoints reject every request.

**2. `scripts/add_song.py`, run locally** with your own AWS credentials —
useful for bulk-adding songs without typing the password into a form:

```bash
FRONTEND_BUCKET=<FrontendBucketNameOutput> python scripts/add_song.py
```

It prompts for the local audio file, title, artist, and an optional cover
image, uploads them to `songs/`, and rewrites `manifest.json` (re-running it
with the same title replaces that song rather than duplicating it).

## Guestbook spam mitigation

The form includes a hidden honeypot field (`website`) — real visitors never
fill it in, so the Lambda silently drops submissions that do. If spam becomes
a real problem, add AWS WAF in front of the API or a CAPTCHA to the form.

## Cost

DynamoDB tables use on-demand (`PAY_PER_REQUEST`) billing and Lambda runs on
ARM (cheaper per-ms). For personal-site traffic levels, this comfortably sits
within the AWS free tier.
