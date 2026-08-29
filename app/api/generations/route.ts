import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabase, getSessionUser } from '@/lib/supabase/server';
import type { CatalogCategory } from '@/types/db';
import { env, isSupabaseConfigured } from '@/lib/env';
import { CAPACITY_MESSAGE } from '@/lib/limits';
import { UPLOAD_BUCKET } from '@/lib/storage';
import { getProvider } from '@/lib/ai/provider';
import { buildPrompt, type PromptContext } from '@/lib/ai/prompt';
import { referenceUrlFor, REFERENCE_CLAUSE } from '@/lib/ai/reference';
import { loadCatalog } from '@/lib/catalog-server';

export const runtime = 'nodejs';

/**
 * Le client n'envoie QUE `imagePath` et des `catalogItemIds` — jamais de prompt libre.
 * Tout l'enchaînement sensible (propriété du fichier, rate limit, plafonds,
 * débit du crédit, insertion) se joue dans `start_generation`, une seule
 * transaction Postgres. L'app ne peut pas en contourner une étape.
 */
const bodySchema = z.object({
  imagePath: z.string().min(1).max(400),
  catalogItemIds: z.array(z.string().uuid()).min(1).max(4),
  profile: z
    .object({
      texture: z.string().max(40).optional(),
      length: z.string().max(40).optional(),
      beard: z.string().max(40).optional(),
      face: z.string().max(40).optional(),
      hairline: z.string().max(40).optional(),
    })
    .optional(),
});

const ERRORS: Record<string, { status: number; message: string }> = {
  auth: { status: 401, message: 'Connecte-toi pour générer une coupe.' },
  file: { status: 400, message: 'Photo introuvable. Reprends-en une.' },
  quota: {
    status: 402,
    message: 'Il te reste 0 coupe. Prends un abonnement pour générer.',
  },
  capacity: { status: 503, message: CAPACITY_MESSAGE },
  rate: {
    status: 429,
    message:
      'Tu as lancé plusieurs coupes d’affilée. Laisse passer quelques minutes et réessaie.',
  },
  rejected: { status: 403, message: 'Ton compte n’a pas accès au service.' },
  payment: {
    status: 402,
    message: 'Ton dernier paiement a été refusé. Mets ton moyen de paiement à jour.',
  },
};

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: 'indisponible', message: 'Le service n’est pas encore configuré.' },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'file', message: 'Requête invalide.' }, { status: 400 });
  }

  const { imagePath, catalogItemIds, profile } = parsed.data;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'auth', message: ERRORS['auth']?.message }, { status: 401 });
  }

  const supabase = await createServerSupabase();

  // --- réservation, débit et insertion, en une transaction ------------------
  // `start_generation` renvoie aussi le gabarit de prompt : la colonne n'est
  // pas lisible par le client, elle ne transite que par cette fonction.
  const { data, error } = await supabase.rpc('start_generation', {
    p_catalog_item_ids: catalogItemIds,
    p_source_path: imagePath,
  });

  if (error) {
    console.error('[generations] start_generation', error.message);
    return NextResponse.json(
      {
        error: 'network',
        // Le crédit vient d'être remboursé par fail_generation : le dire, sinon
        // la personne croit avoir perdu une coupe.
        message: 'Le service de rendu n’a pas répondu. Ta coupe t’a été rendue, réessaie.',
      },
      { status: 502 },
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        generation_id: string | null;
        callback_secret: string | null;
        credits_left: number;
        prompt_templates: string[] | null;
        categories: CatalogCategory[] | null;
        error_code: string | null;
      }
    | undefined;

  if (
    !row ||
    row.error_code ||
    !row.generation_id ||
    !row.callback_secret ||
    !row.prompt_templates ||
    !row.categories
  ) {
    const code = row?.error_code ?? 'network';
    const mapped = ERRORS[code] ?? { status: 502, message: 'La connexion a été interrompue. Réessaie.' };
    return NextResponse.json({ error: code, message: mapped.message }, { status: mapped.status });
  }

  const generationId = row.generation_id;
  const callbackSecret = row.callback_secret;

  // --- appel provider, sans attendre le résultat ---------------------------
  try {
    const { data: signed } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .createSignedUrl(imagePath, 60);
    if (!signed?.signedUrl) throw new Error('URL signée indisponible');

    const context: PromptContext = profile ?? {};

    // Photos de référence : elles montrent la coupe au lieu de la décrire. Les
    // slugs viennent du catalogue public, jamais du corps de la requête.
    const catalog = await loadCatalog();
    const referenceUrls = catalogItemIds
      .map((id) => catalog.find((item) => item.id === id)?.slug)
      .filter((slug): slug is string => typeof slug === 'string')
      .map((slug) => referenceUrlFor(slug))
      .filter((url): url is string => url !== null);

    const prompt = [
      buildPrompt(row.prompt_templates, row.categories, context),
      referenceUrls.length > 0 ? REFERENCE_CLAUSE : '',
    ]
      .filter((part) => part.length > 0)
      .join(' ');

    const { jobId } = await getProvider().generate({
      imageUrl: signed.signedUrl,
      prompt,
      generationId,
      callbackSecret,
      sourcePath: imagePath,
      webhookUrl: `${env.siteUrl}/api/webhooks/ai`,
      referenceUrls,
    });

    // Écrire directement dans `generations` ne marche pas : la table n'a qu'une
    // politique de lecture, donc la RLS filtrait la mise à jour sans lever
    // d'erreur et la coupe restait « en attente » pour toujours. On passe par
    // une fonction qui vérifie la propriété de la ligne.
    const { data: marked, error: markError } = await supabase.rpc(
      'mark_generation_processing',
      { p_generation_id: generationId, p_job_id: jobId },
    );

    if (markError || marked !== true) {
      console.error(
        '[generations] passage en cours de rendu',
        markError?.message ?? 'aucune ligne mise à jour',
      );
    }
  } catch (providerError) {
    console.error('[generations] provider', providerError);
    await supabase.rpc('fail_generation', {
      p_generation_id: generationId,
      p_secret: callbackSecret,
      p_error_code: 'provider',
      p_error_message: 'Le service de rendu n’a pas répondu. Ta coupe t’a été rendue.',
    });
    return NextResponse.json(
      {
        error: 'network',
        // Le crédit vient d'être remboursé par fail_generation : le dire, sinon
        // la personne croit avoir perdu une coupe.
        message: 'Le service de rendu n’a pas répondu. Ta coupe t’a été rendue, réessaie.',
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ generationId, creditsLeft: row.credits_left });
}
