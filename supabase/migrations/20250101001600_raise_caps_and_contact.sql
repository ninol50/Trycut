-- Plafonds relevés : les valeurs de développement bloquaient de vrais clients.
--
-- 15 coupes par jour pour tout le site, c'était moins qu'un seul abonné Pack.
-- 5 coupes par heure et par compte, c'était très serré pour un Pass qui en a
-- payé 50.
--
-- Le plafond de dépense mensuel ne bouge pas : c'est lui qui borne la facture,
-- et il reste à 18 € — soit 450 coupes. Relever les compteurs sans toucher à
-- l'argent augmente le service sans augmenter le risque.
update public.app_config
   set user_hourly_limit    = 15,
       daily_generation_cap = 200
 where id = 1;
