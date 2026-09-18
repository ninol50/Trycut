import { createAdminSupabase } from '@/lib/supabase/server';
import { listValidMemberships } from '@/lib/whop-api';
import { CREDITS_BY_PLAN, type PaidPlanId } from '@/lib/pricing';

export type EtatVerification = 'accorde' | 'deja' | 'introuvable' | 'indisponible';

/**
 * Délai avant qu'une même offre puisse re-créditer un compte.
 *
 * Un peu moins que la période facturée : un renouvellement qui tombe deux
 * jours tôt ne doit pas être ignoré. Beaucoup moins, et un client pourrait se
 * faire recréditer en boucle en revenant sur la page.
 */
const FENETRE_JOURS: Record<PaidPlanId, number> = {
  pack: 27,
  pass: 27,
  trimestre: 330,
};

/**
 * Accorde l'accès à partir de ce que Whop dit, au lieu d'attendre son webhook.
 *
 * Le webhook reste le chemin normal — il crédite en quelques secondes. Mais
 * c'est un point de panne unique : s'il n'arrive pas, personne ne le sait, et
 * un client qui a payé se retrouve devant un cadenas sans recours. Ici, c'est
 * le site qui interroge Whop et décide. Un paiement finit donc toujours par
 * ouvrir l'accès : à la seconde par le webhook, au clic par le bouton de
 * vérification, ou dans la journée par le cron.
 *
 * Écrit avec la clé de service : il n'y a pas de session à ce stade, et le
 * compte lui-même n'a pas le droit de modifier son offre.
 */
export async function accorderDepuisWhop(
  userId: string,
  emails: readonly (string | null | undefined)[],
): Promise<EtatVerification> {
  const rows = await listValidMemberships();
  if (!rows) return 'indisponible';

  const cibles = new Set(
    emails
      .filter((email): email is string => Boolean(email))
      .map((email) => email.toLowerCase().trim()),
  );

  const trouve = rows.find((row) => cibles.has(row.email));
  if (!trouve) return 'introuvable';

  const admin = createAdminSupabase();
  if (!admin) return 'indisponible';

  const { error } = await admin
    .from('profiles')
    .update({ plan: trouve.plan, subscription_status: 'active' })
    .eq('id', userId);

  if (error) return 'indisponible';

  // Les coupes ne sont accordées qu'une fois par période : revenir sur la page
  // ne doit pas recréditer. Le grand livre fait foi, c'est lui qui a servi à
  // débiter.
  const depuis = new Date(
    Date.now() - FENETRE_JOURS[trouve.plan] * 24 * 3600 * 1000,
  ).toISOString();

  const { data: deja } = await admin
    .from('credit_ledger')
    .select('id')
    .eq('user_id', userId)
    .eq('reason', 'subscription_grant')
    .gte('created_at', depuis)
    .limit(1);

  if (((deja as { id: string }[] | null) ?? []).length > 0) return 'deja';

  const { error: creditError } = await admin.rpc('grant_credits', {
    p_user_id: userId,
    p_amount: CREDITS_BY_PLAN[trouve.plan],
    p_reason: 'subscription_grant',
  });

  return creditError ? 'indisponible' : 'accorde';
}
