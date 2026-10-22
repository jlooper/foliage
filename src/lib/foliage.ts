import { cloudinary } from './cloudinary';
import { scorePalette, TARGETS } from './rubric.mjs';

const GALLERY_TAG = 'local-leaf-gallery';
const LEGACY_GALLERY_TAG = 'foliage-gallery';
// Tagged copies outside these folders are stray duplicates; keep them out of the gallery.
const GALLERY_FOLDERS = ['foliage', 'local-leaf'];

function mapResource(resource: any) {
  const context = resource.context?.custom ?? resource.context ?? {};
  const palette = typeof context.color_palette === 'string'
    ? context.color_palette.split(',').flatMap((entry: string) => {
      const [hex, share] = entry.split(':');
      const numericShare = Number(share);
      return /^#[\da-f]{6}$/i.test(hex ?? '') && Number.isFinite(numericShare) ? [[hex, numericShare]] : [];
    })
    : [];
  const scores = Object.fromEntries(Object.entries(TARGETS).map(([key, target]) => [
    key,
    scorePalette(palette, target.hex),
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
    palette,
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