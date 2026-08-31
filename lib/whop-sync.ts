import { createAdminSupabase } from '@/lib/supabase/server';
import { planForEmail } from '@/lib/whop-api';
import { CREDITS_BY_PLAN } from '@/lib/pricing';
import type { Profile } from '@/types/db';

/** Durée d'une période de facturation, par offre. */
const PERIODE_JOURS: Record<'pack' | 'pass', number> = { pack: 7, pass: 30 };

/**
 * Aligne l'accès du compte sur ce que dit Whop.
 *
 * C'est la réponse à deux besoins : qu'un paiement ouvre l'accès, et qu'un
 * paiement refusé le referme. On interroge Whop plutôt que d'attendre qu'il
 * nous prévienne — un message perdu laisserait l'accès ouvert à quelqu'un qui
 * ne paie plus, alors qu'ici l'accès colle en permanence à la réalité.
 *
 * Ne touche jamais un accès offert ni un administrateur : ceux-là ne passent
 * pas par Whop.
 */
export async function syncAccessFromWhop(profile: Profile): Promise<void> {
  if (profile.is_admin || profile.access_status === 'granted' || profile.access_status === 'rejected') {
    return;
  }

  const admin = createAdminSupabase();
  if (!admin) return;

  const adresses = [profile.email, profile.billing_email].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );

  let plan: 'pack' | 'pass' | null = null;
  for (const adresse of adresses) {
    plan = await planForEmail(adresse);
    if (plan) break;
  }

  // --- Whop ne connaît pas cette personne : on referme -----------------------
  if (!plan) {
    if (profile.subscription_status === 'active') {
      await admin
        .from('profiles')
        .update({ subscription_status: 'canceled', plan: 'free' })
        .eq('id', profile.id);
    }
    return;
  }

  // --- Abonnement valide : on ouvre ----------------------------------------
  if (profile.subscription_status !== 'active' || profile.plan !== plan) {
    await admin
      .from('profiles')
      .update({ plan, subscription_status: 'active' })
      .eq('id', profile.id);
  }

  // Les coupes sont accordées une fois par période. Sans ça, ouvrir la page
  // deux fois de suite créditerait deux fois.
  const depuis = new Date(
    Date.now() - PERIODE_JOURS[plan] * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { count } = await admin
    .from('credit_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('reason', 'subscription_grant')
    .gt('created_at', depuis);

  if ((count ?? 0) === 0) {
    await admin.rpc('grant_credits', {
      p_user_id: profile.id,
      p_amount: CREDITS_BY_PLAN[plan],
      p_reason: 'subscription_grant',
    });
  }
}
