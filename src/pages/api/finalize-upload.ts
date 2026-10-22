import type { APIRoute } from 'astro';
import { cloudinary } from '../../lib/cloudinary';
import { GALLERY_TAG } from '../../lib/foliage';
import { serializePredominant } from '../../lib/rubric.mjs';

function cleanField(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, maxLength) : '';
}

export const POST: APIRoute = async ({ request }) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return Response.json({ error: 'Image uploads are not configured yet.' }, { status: 503 });
  }

  let body: { publicId?: unknown; treeType?: unknown; neighborhood?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'The photo could not be saved. Please try again.' }, { status: 400 });
  }

  const publicId = typeof body.publicId === 'string' ? body.publicId : '';
  const treeType = cleanField(body.treeType, 80);
  const neighborhood = cleanField(body.neighborhood, 80);

  if (!publicId) {
    return Response.json({ error: 'The photo could not be saved. Please try again.' }, { status: 400 });
  }
  if (!treeType || !neighborhood) {
    return Response.json({ error: 'Add the tree type and neighborhood to continue.' }, { status: 400 });
  }

  try {
    const details = await cloudinary.api.resource(publicId, { colors: true });

    // The widget upload is unsigned and client-controlled, so only touch resources it actually tagged.
    if (!Array.isArray(details.tags) || !details.tags.includes(GALLERY_TAG)) {
      return Response.json({ error: 'The photo could not be saved. Please try again.' }, { status: 400 });
    }

    // Cloudinary's own named-color buckets (red, pink, lightblue, ...) and their share of the photo.
    const predominant = Array.isArray(details.predominant?.cloudinary) ? details.predominant.cloudinary : [];
    const compactPredominant = serializePredominant(predominant);

    const context: Record<string, string> = {
      tree_type: treeType,
      neighborhood,
      location_visibility: 'neighborhood only',
    };
    if (compactPredominant) context.predominant = compactPredominant;

    await cloudinary.uploader.explicit(publicId, { type: 'upload', context });

    return Response.json({
      tree: { publicId, treeType, neighborhood, predominant, moderationStatus: 'pending' },
    }, { status: 200 });
  } catch {
    return Response.json({ error: 'The photo could not be saved. Please try again.' }, { status: 502 });
  }
};
