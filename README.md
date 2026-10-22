# Local Leaf

A neighborhood gallery for finding and sharing remarkable trees, ranked by how much orange, red, or yellow Cloudinary detects in each photo. Astro renders the gallery on the server and exposes a small API; Cloudinary stores the images, moderates them, and analyzes their colors. There is no database of its own.

## Architecture

| Piece | Where | Role |
| --- | --- | --- |
| Gallery page | [src/pages/index.astro](src/pages/index.astro) | Server-rendered. Fetches approved assets, scores and sorts them, and hosts the upload form and Cloudinary Upload Widget. A little client script switches leaderboards and localizes timestamps. |
| Gallery query | [src/lib/foliage.ts](src/lib/foliage.ts) | Cloudinary Search API query for approved assets in the gallery folders; maps each asset to a tree with its scores. |
| Scoring | [src/lib/rubric.mjs](src/lib/rubric.mjs) | Turns Cloudinary's predominant-color breakdown into 0–100 leaderboard scores. |
| Finalize endpoint | [src/pages/api/finalize-upload.ts](src/pages/api/finalize-upload.ts) | Server-side step after each upload: verifies the asset, fetches its color analysis, and writes metadata. |
| Trees endpoint | [src/pages/api/trees.ts](src/pages/api/trees.ts) | `GET /api/trees` returns the same gallery data as JSON. |
| Cloudinary client | [src/lib/cloudinary.ts](src/lib/cloudinary.ts) | SDK configured from server-only environment variables. |
| Backfill | [scripts/backfill-predominant.mjs](scripts/backfill-predominant.mjs) | One-off script for assets uploaded before the color-based scoring. |

The site runs with `output: 'server'` on Netlify (`@astrojs/netlify`), so the API secret never reaches the browser.

### Upload flow

1. A contributor enters a tree type and neighborhood and picks photos in the Cloudinary Upload Widget. No device location is requested.
2. The widget uploads straight from the browser to Cloudinary with an **unsigned upload preset** (`CLOUDINARY_UPLOAD_PRESET`), tagging each asset `local-leaf-gallery` and attaching the tree type and neighborhood as context. Uploads therefore never pass through a Netlify function, so Netlify's payload limit doesn't apply.
3. For each uploaded photo the page calls `POST /api/finalize-upload` with the public ID, tree type, and neighborhood. The server:
   - rejects any asset that doesn't carry the gallery tag, since the unsigned upload is client-controlled;
   - fetches the asset with `colors: true`;
   - saves the tree type, neighborhood, and Cloudinary's predominant-color breakdown (for example `red:50.0,lightblue:26.0,pink:9.8`) to the asset's context metadata.
4. The asset waits in Cloudinary's manual moderation queue and does not appear publicly until approved.

Moderation and the destination folder are set on the upload preset in the Cloudinary console, because an unsigned upload can't override them per request. The same goes for accepted file types and the maximum file size.

### Moderation

Review submissions in the Cloudinary Media Library under **Moderation → Manual**. The gallery query only returns assets with `approved` status, so pending and rejected assets stay out of the rankings. Cloudinary notes that moderated assets may still be directly deliverable by URL by default; contact Cloudinary Support if pending assets must be blocked at the delivery layer.

### Gallery query

The gallery returns up to 100 approved images tagged `local-leaf-gallery` (or the legacy `foliage-gallery`) that live in the `foliage` or `local-leaf` folder, newest first. Tagged copies outside those folders are ignored.

## Scoring

Cloudinary's color analysis sorts a photo's pixels into named color buckets such as `red`, `pink`, `orange`, and `lightblue`, each with its share of the photo. A tree's score on a leaderboard is the combined share of that leaderboard's buckets:

| Leaderboard | Buckets counted |
| --- | --- |
| Orange | `orange` |
| Red | `red`, `pink` (crimson leaves often split between the two) |
| Yellow | `yellow` |

A photo that is 50% red scores 50 on the red board. Photos with no stored color data show as Unranked. The score relies on Cloudinary's color grouping; it does not identify leaves or tree species. To change what counts toward a board, edit `buckets` in `TARGETS`.

Photos uploaded before this scoring existed have no `predominant` metadata. Add it with:

```sh
node --env-file=.env scripts/backfill-predominant.mjs --dry-run   # preview
node --env-file=.env scripts/backfill-predominant.mjs             # apply
```

The script skips assets that already have the data, so it is safe to re-run.

## Run locally

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in:

- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: server-only credentials. Keep `.env` private.
- `CLOUDINARY_UPLOAD_PRESET`: the name of the unsigned upload preset the widget uses. It is not secret. Without it, uploads show as not configured.

Set the same variables in the Netlify site settings for deployment.

## Checks

```sh
npm test
npm run build
```

## Before opening to the public

Anonymous public submissions are enabled for this MVP and require manual approval. Because uploads go straight to Cloudinary from the browser, abuse protection belongs there (preset file limits, moderation) and on `/api/finalize-upload`. Add deployment-appropriate rate limiting before opening the service broadly.
