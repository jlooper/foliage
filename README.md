# Local Leaf

A neighborhood gallery for finding and sharing remarkable trees. Astro serves the gallery and upload API; Cloudinary stores public image assets and their tree metadata.

## Run locally

```sh
npm install
npm run dev
```

Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to the root `.env` file. Keep `.env` private. The sample `.env.example` contains placeholders only.

## Uploads and scoring

The server accepts JPEG, PNG, WebP, and AVIF images up to 5 MB (kept under Netlify's ~6 MB synchronous function payload limit). Contributors enter a tree type and neighborhood name; the app does not request device coordinates. New uploads use the `local-leaf-gallery` tag and `local-leaf` asset folder, are marked for Cloudinary manual moderation, and store the tree type, neighborhood, and a compact palette in contextual metadata. Only assets with approved moderation status appear in the public gallery. Existing approved assets tagged `foliage-gallery` remain visible.

Review submissions in the Cloudinary Media Library under **Moderation → Manual**. Approving an asset makes it eligible for the next gallery query; rejected and pending assets stay out of the public rankings. Cloudinary notes that moderated assets may still be directly deliverable by URL by default; contact Cloudinary Support if pending assets must be blocked at the delivery layer.

Cloudinary returns a detected palette of prominent colors and their approximate share of the photo. For each orange, red, or yellow leaderboard, the score finds the palette tone with the closest CIELAB hue angle to the target hue, then converts hue difference to a 0–100 score (red uses a narrower hue tolerance, since orange sits only ~20° away). Lightness does not lower the hue score, so a dark maroon can rank close to bright red. Very low-chroma colors receive a confidence adjustment because their hue is unreliable. Palette share is shown for context but does not affect ranking. This compares Cloudinary's detected palette, not every image pixel, and does not identify leaves or tree species.

The app uses server-signed SDK uploads, so the API secret stays on the server. It does not require an unsigned upload preset. The existing `foliage` upload preset remains unchanged in Cloudinary.

## Checks

```sh
npm test
npm run build
```

Anonymous public submissions are enabled for this MVP and require manual approval. Add deployment-appropriate rate limiting before opening the service broadly.
