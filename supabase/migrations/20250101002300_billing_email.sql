-- Adresse utilisée pour payer chez Whop.
--
-- Le rattachement d'un paiement au compte se fait par l'email. Quelqu'un qui
-- paie avec une autre adresse que celle de son compte n'était jamais crédité,
-- et rien ne le prévenait. La page tarifs demande donc désormais de confirmer
-- l'adresse avant d'aller payer, et c'est celle-là qu'on retient.
alter table public.profiles add column if not exists billing_email text;

comment on column public.profiles.billing_email is
  'Adresse confirmée au moment de payer. Le webhook Whop rattache un paiement au compte par cette adresse ou par email.';

create index if not exists profiles_billing_email_idx
  on public.profiles (lower(billing_email));

create or replace function public.set_billing_email(p_email text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(p_email));
begin
  if v_uid is null then
    return false;
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'adresse invalide' using errcode = '22023';
  end if;

  update public.profiles set billing_email = v_email where id = v_uid;
  return found;
end;
$function$;

revoke all on function public.set_billing_email(text) from public, anon;
grant execute on function public.set_billing_email(text) to authenticated;
