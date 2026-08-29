-- Moindre privilège sur les rôles exposés au navigateur.
--
-- Supabase accorde par défaut tous les droits sur les tables du schéma public à
-- anon et authenticated, en comptant sur la RLS pour filtrer. C'est vrai pour
-- SELECT/INSERT/UPDATE/DELETE, mais TRUNCATE ignore la RLS : le droit n'était
-- pas atteignable depuis l'API REST, qui n'expose pas ce verbe, mais il n'a
-- aucune raison d'exister. TRIGGER et REFERENCES non plus.
revoke truncate, trigger, references on all tables in schema public
  from anon, authenticated;

-- Tables qui ne sont jamais lues ni écrites depuis une session client : elles
-- n'appartiennent qu'aux fonctions security definer et à la clé service_role.
revoke all on table
  public.credit_ledger,
  public.daily_spend,
  public.ip_generation_log,
  public.webhook_events
  from anon, authenticated;

-- Le catalogue est en lecture seule côté client. Les colonnes lisibles sont
-- accordées une à une par la migration 000600 ; prompt_template en est exclu.
revoke insert, update, delete on table public.catalog_items
  from anon, authenticated;

-- Un profil est créé par le déclencheur sur auth.users et supprimé par
-- delete_own_account(). Le client ne fait que lire et mettre à jour le sien.
revoke insert, delete on table public.profiles from anon, authenticated;

-- Les réponses d'onboarding s'écrivent, ne s'effacent pas.
revoke delete on table public.onboarding_responses from anon, authenticated;
