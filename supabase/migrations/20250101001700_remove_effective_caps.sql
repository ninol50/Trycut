-- Plafonds effectivement retirés, à la demande du propriétaire.
--
-- Le raisonnement tient : le vrai plafond, c'est le solde prépayé chez fal.
-- Il refuse dès que le compte est vide, et le site rend alors la coupe. Le
-- plafond logiciel faisait doublon et ne servait qu'à bloquer de vrais clients
-- avant que la limite réelle soit atteinte.
--
-- Les valeurs sont hautes plutôt que supprimées : le mécanisme reste en place
-- au cas où il faudrait rebaisser un jour, sans rien réécrire.
--
-- La limite par compte et par heure est conservée à 60 — une par minute. Ce
-- n'est pas un plafond de dépense mais une protection contre un script qui
-- viderait le solde en quelques minutes depuis un seul compte.
update public.app_config
   set daily_generation_cap    = 100000,
       monthly_spend_cap_cents = 1000000,
       user_hourly_limit       = 60
 where id = 1;
