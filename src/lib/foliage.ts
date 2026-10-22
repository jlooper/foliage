import { cloudinary } from './cloudinary';
import { parsePredominant, scorePredominant, TARGETS } from './rubric.mjs';

const GALLERY_TAG = 'local-leaf-gallery';
const LEGACY_GALLERY_TAG = 'foliage-gallery';
// Tagged copies outside these folders are stray duplicates; keep them out of the gallery.
const GALLERY_FOLDERS = ['foliage', 'local-leaf'];

function mapResource(resource: any) {
  const context = resource.context?.custom ?? resource.context ?? {};
  const predominant = parsePredominant(context.predominant);
  const scores = Object.fromEntries(Object.keys(TARGETS).map((key) => [
    key,
    scorePredominant(predominant, key),
  ]));

  return {
    id: resource.asset_id,
    publicId: resource.public_id,
    imageUrl: cloudinary.url(resource.public_id, {
      version: resource.version,
      secure: true,
      width: 1100,
      height: 1300,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
    }),
    createdAt: resource.created_at,
    treeType: context.tree_type || 'Tree species not listed',
    neighborhood: context.neighborhood || 'Neighborhood not listed',
    predominant,
    scores,
  };
}

export async function getFoliageGallery() {
  const result = await cloudinary.search
    .expression(`resource_type:image AND (tags=${GALLERY_TAG} OR tags=${LEGACY_GALLERY_TAG}) AND (${GALLERY_FOLDERS.map((folder) => `folder:${folder}`).join(' OR ')}) AND moderation_status=approved`)
    .with_field('context')
    .with_field('tags')
    .sort_by('created_at', 'desc')
    .max_results(100)
    .execute();

  return (result.resources ?? []).map(mapResource);
}

export { GALLERY_TAG };