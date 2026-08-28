import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { readGuestId } from '@/lib/guest';
import { siteUrl } from '@/lib/env';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(72),
  firstName: z.string().trim().min(1).max(24),
  // Âge minimum 15 ans : consentement numérique en France. Déclaration
  // obligatoire, jamais pré-cochée côté UI.
  ageConfirmed: z.literal(true),
  answers: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          'Vérifie ton email, ton mot de passe (8 caractères minimum), ton prénom et la case d’âge.',
      },
      { status: 400 },
    );
  }

  const { email, password, firstName, answers } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json(
      { message: traduireErreur(error.message) },
      { status: 400 },
    );
  }

  const userId = data.user?.id;
  if (!userId) {
    return NextResponse.json(
      { message: 'La création du compte a échoué. Réessaie.' },
      { status: 502 },
    );
  }

  // Le crédit offert n'est PAS accordé ici : il attend la vérification de
  // l'email (section 7.4). Voir `/auth/callback`.
  try {
    const admin = createAdminClient();

    await admin
      .from('profiles')
      .update({ first_name: firstName, age_confirmed: true })
      .eq('id', userId);

    if (answers) {
      await admin
        .from('onboarding_responses')
        .upsert(
          { user_id: userId, answers, completed_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
    }

    // Les essais réalisés avant l'inscription rejoignent le compte : c'est la
    // promesse « crée un compte pour sauvegarder ».
    const guestId = await readGuestId();
    if (guestId) {
      await admin.rpc('claim_guest_generations', {
        p_user_id: userId,
        p_guest_id: guestId,
      });
    }
  } catch (error) {
    console.error('[signup] finalisation partielle', error);
  }

  await sendEmail({
    to: email,
    subject: 'Confirme ton adresse pour débloquer ton essai',
    html: `<p>Salut ${firstName},</p><p>Confirme ton adresse email depuis le message d’activation pour débloquer ton essai offert.</p>`,
  });

  return NextResponse.json({
    userId,
    // Sans confirmation d'email requise côté projet Supabase, la session
    // existe déjà et on peut enchaîner directement.
    sessionReady: data.session !== null,
  });
}

function traduireErreur(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'Un compte existe déjà avec cette adresse. Connecte-toi.';
  }
  if (lower.includes('password')) {
    return 'Mot de passe trop court. Il faut au moins 8 caractères.';
  }
  return 'La création du compte a échoué. Réessaie.';
}
