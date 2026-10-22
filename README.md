# Local Leaf

A neighborhood gallery for finding and sharing remarkable trees. Astro serves the gallery and upload API; Cloudinary stores public image assets and their tree metadata.

## Run locally

```sh
npm install
npm run dev
```

Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to the root `.env` file. Keep `.env` private. The sample `.env.example` contains placeholders only.

## Uploads and scoring

The server accepts JPEG, PNG, WebP, and AVIF images up to 5 MB (kept under Netlify's ~6 MB synchronous function payload limit). Contributors enter a tree type and neighborhood name; the app does not request device coordinates. New uploads use the `local-leaf-gallery` tag and `local-leaf` asset folder, are marked for Cloudinary manual moderation, and store the tree type, neighborhood, and Cloudinary's predominant-color breakdown in contextual metadata. Only assets with approved moderation status appear in the public gallery. Existing approved assets tagged `foliage-gallery` remain visible.

Review submissions in the Cloudinary Media Library under **Moderation → Manual**. Approving an asset makes it eligible for the next gallery query; rejected and pending assets stay out of the public rankings. Cloudinary notes that moderated assets may still be directly deliverable by URL by default; contact Cloudinary Support if pending assets must be blocked at the delivery layer.

Cloudinary's color analysis (`colors: true`) sorts a photo's pixels into named color buckets such as `red`, `pink`, `orange`, and `lightblue`, each with its share of the photo. On upload the app stores that breakdown in the asset's `predominant` context key (for example `red:50.0,lightblue:26.0,pink:9.8`). A tree's score on each leaderboard is the combined share of that leaderboard's buckets: orange counts `orange`, yellow counts `yellow`, and red counts `red` and `pink`, since crimson leaves are often split between the two. A photo that is 50% red scores 50 on the red board. This relies on Cloudinary's color grouping, not on identifying leaves or tree species. Photos uploaded before this change can be updated with `node --env-file=.env scripts/backfill-predominant.mjs` (add `--dry-run` to preview); until then they show as Unranked.

The app uses server-signed SDK uploads, so the API secret stays on the server. It does not require an unsigned upload preset. The existing `foliage` upload preset remains unchanged in Cloudinary.

## Checks

```sh
npm test
npm run build
```

Anonymous public submissions are enabled for this MVP and require manual approval. Add deployment-appropriate rate limiting before opening the service broadly.
