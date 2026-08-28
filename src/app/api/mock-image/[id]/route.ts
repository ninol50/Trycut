import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decodePath } from '@/lib/storage';
import { AI_PROVIDER } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * Sortie du `MockProvider`.
 *
 * Elle sert l'image « après » de démonstration si `/public/demo/after-1.jpg`
 * existe ; sinon elle renvoie la photo source elle-même, pour que le pipeline
 * complet (téléchargement → stockage privé → URL signée) soit réellement
 * exercé même sans visuel de démo dans le dépôt.
 *
 * Route inactive dès que `AI_PROVIDER` vaut autre chose que `mock`.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (AI_PROVIDER !== 'mock') {
    return NextResponse.json({ message: 'Route réservée au fournisseur mock.' }, { status: 404 });
  }

  const { id } = await context.params;

  const demo = await readDemoImage();
  if (demo) {
    return new NextResponse(new Uint8Array(demo), {
      headers: { 'content-type': 'image/jpeg', 'cache-control': 'no-store' },
    });
  }

  const source = await readSourceImage(id);
  if (source) {
    return new NextResponse(new Uint8Array(source.bytes), {
      headers: { 'content-type': source.contentType, 'cache-control': 'no-store' },
    });
  }

  return NextResponse.json({ message: 'Aucune image de démonstration.' }, { status: 404 });
}

async function readDemoImage(): Promise<Buffer | null> {
  try {
    return await readFile(path.join(process.cwd(), 'public', 'demo', 'after-1.jpg'));
  } catch {
    return null;
  }
}

async function readSourceImage(
  generationId: string,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('generations')
      .select('source_path')
      .eq('id', generationId)
      .maybeSingle<{ source_path: string }>();

    if (!data?.source_path) return null;
    const decoded = decodePath(data.source_path);
    if (!decoded) return null;

    const { data: file, error } = await admin.storage.from(decoded.bucket).download(decoded.path);
    if (error || !file) return null;

    return { bytes: await file.arrayBuffer(), contentType: file.type || 'image/jpeg' };
  } catch {
    return null;
  }
}
