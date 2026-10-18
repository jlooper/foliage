import type { APIRoute } from 'astro';
import { getFoliageGallery } from '../../lib/foliage';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const trees = await getFoliageGallery();
    return Response.json({ trees });
  } catch {
    return Response.json({ error: 'The foliage gallery is temporarily unavailable.' }, { status: 503 });
  }
};