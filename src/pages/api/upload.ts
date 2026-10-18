import type { APIRoute } from 'astro';
import { cloudinary } from '../../lib/cloudinary';
import { GALLERY_TAG } from '../../lib/foliage';

export const prerender = false;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function cleanField(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, maxLength) : '';
}

function uploadImage(buffer: Buffer, options: Record<string, unknown>) {
  return new Promise<any>((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) reject(new Error('Cloudinary upload failed'));
      else resolve(result);
    }).end(buffer);
  });
}

export const POST: APIRoute = async ({ request }) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return Response.json({ error: 'Image uploads are not configured yet.' }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Choose an image file and try again.' }, { status: 400 });
  }

  const image = form.get('photo');
  const treeType = cleanField(form.get('treeType'), 80);
  const neighborhood = cleanField(form.get('neighborhood'), 80);

  if (!(image instanceof File) || image.size === 0) {
    return Response.json({ error: 'Choose a photo of your tree.' }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
    return Response.json({ error: 'Use a JPEG, PNG, WebP, or AVIF image.' }, { status: 415 });
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: 'Choose an image smaller than 10 MB.' }, { status: 413 });
  }
  if (!treeType || !neighborhood) {
    return Response.json({ error: 'Add the tree type and neighborhood to continue.' }, { status: 400 });
  }

  try {
    const result = await uploadImage(Buffer.from(await image.arrayBuffer()), {
      asset_folder: 'local-leaf',
      tags: [GALLERY_TAG],
      context: {
        tree_type: treeType,
        neighborhood,
        location_visibility: 'neighborhood only',
      },
      moderation: 'manual',
      colors: true,
      transformation: { width: 3000, height: 3000, crop: 'limit' },
    });

    let palette = Array.isArray(result.colors) ? result.colors : [];
    if (palette.length === 0) {
      try {
        const details = await cloudinary.api.resource(result.public_id, { colors: true });
        palette = Array.isArray(details.colors) ? details.colors : [];
      } catch {
        palette = [];
      }
    }

    if (palette.length > 0) {
      const compactPalette = palette.slice(0, 8)
        .filter((entry: unknown) => Array.isArray(entry) && /^#[\da-f]{6}$/i.test(String(entry[0])))
        .map(([hex, share]: [string, number]) => `${hex}:${Number(share).toFixed(1)}`)
        .join(',');
      try {
        await cloudinary.uploader.explicit(result.public_id, {
          type: 'upload',
          context: {
            tree_type: treeType,
            neighborhood,
            location_visibility: 'neighborhood only',
            color_palette: compactPalette,
          },
        });
      } catch {
        palette = [];
      }
    }

    return Response.json({
      tree: {
        publicId: result.public_id,
        treeType,
        neighborhood,
        palette,
        moderationStatus: 'pending',
      },
    }, { status: 201 });
  } catch {
    return Response.json({ error: 'The photo could not be uploaded. Please try again.' }, { status: 502 });
  }
};