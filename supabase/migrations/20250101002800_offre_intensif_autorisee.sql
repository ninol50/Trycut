-- L'offre Intensif ('trimestre') était encaissée mais refusée à l'usage.
--
-- `start_generation` n'acceptait que 'pack' et 'pass'. Un client abonné à
-- 34,90 € par mois aurait payé, puis reçu « quota » à chaque coupe : l'offre la
-- plus chère était la seule totalement inutilisable. Même oubli dans
-- `admin_set_subscription`, qui refusait d'accorder l'offre à la main.
--
-- Second défaut corrigé ici : `admin_set_subscription` ne comptait que 7 jours
-- avant de re-créditer une offre 'pack'. C'était juste quand 'pack' était
-- l'abonnement hebdomadaire ; les trois offres étant désormais mensuelles, la
-- fenêtre courte aurait crédité deux fois dans le même mois.
--
-- La correction est faite par substitution sur la définition existante plutôt
-- qu'en recopiant le corps : recopier une fonction de cent lignes pour changer
-- deux mots est le meilleur moyen d'en perdre une au passage. Rejouer ce script
-- est sans effet une fois la substitution faite.
do $patch$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'start_generation'
     and pg_get_function_identity_arguments(p.oid) like '%[]%';

  if v_def is not null then
    v_def := replace(v_def,
      'v_profile.plan not in (''pack'', ''pass'')',
      'v_profile.plan not in (''pack'', ''pass'', ''trimestre'')');
    execute v_def;
  end if;

  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'admin_set_subscription';

  if v_def is not null then
    v_def := replace(v_def,
      'p_plan not in (''free'', ''pack'', ''pass'')',
      'p_plan not in (''free'', ''pack'', ''pass'', ''trimestre'')');
    v_def := replace(v_def,
      '(case when p_plan = ''pack'' then interval ''7 days''
                                    else interval ''30 days'' end)',
      'interval ''30 days''');
    execute v_def;
  end if;
end
$patch$;
