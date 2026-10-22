// Adds Cloudinary's predominant-color buckets to gallery assets uploaded before
// the leaderboard switched to them. Safe to re-run: assets that already have
// `predominant` are skipped. Pass --dry-run to preview.
//   node --env-file=.env scripts/backfill-predominant.mjs [--dry-run]
import { v2 as cloudinary } from 'cloudinary';
import { serializePredominant } from '../src/lib/rubric.mjs';

const dryRun = process.argv.includes('--dry-run');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const result = await cloudinary.search
  .expression('resource_type:image AND (tags=local-leaf-gallery OR tags=foliage-gallery) AND (folder:foliage OR folder:local-leaf)')
  .with_field('context')
  .max_results(500)
  .execute();

for (const resource of result.resources ?? []) {
  const context = resource.context?.custom ?? resource.context ?? {};
  if (context.predominant) {
    console.log(`skip   ${resource.public_id} (already has predominant)`);
    continue;
  }

  const details = await cloudinary.api.resource(resource.public_id, { colors: true });
  const value = serializePredominant(details.predominant?.cloudinary);
  if (!value) {
    console.log(`empty  ${resource.public_id}`);
    continue;
  }

  console.log(`${dryRun ? 'would set' : 'set'}  ${resource.public_id}  ${value}`);
  if (!dryRun) await cloudinary.uploader.add_context(`predominant=${value}`, [resource.public_id]);
}
