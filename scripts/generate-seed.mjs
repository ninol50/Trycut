/**
 * Régénère le seed SQL depuis lib/catalog-data.ts (source de vérité).
 * Usage : node scripts/generate-seed.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ts = readFileSync('lib/catalog-data.ts', 'utf8');
const start = ts.indexOf('CATALOG_SEED: readonly CatalogSeed[] = ');
const open = ts.indexOf('= [', start) + 2;
const close = ts.indexOf('\n];', open);
const items = JSON.parse(ts.slice(open, close + 2));

const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
const arr = (values) => `array[${values.map(q).join(',')}]`;

const rows = items.map(
  (item) =>
    `(${q(item.slug)},${q(item.label)},${q(item.category)},\n ${arr(item.style_tags)},\n ${q(item.prompt_template)},\n ${q(item.preview_path)}, ${item.is_premium}, ${item.sort_order})`,
);

const sql = `-- Seed du catalogue : ${items.length} entrées (${items.filter((i) => i.category === 'cut').length} coupes, ${items.filter((i) => i.category === 'color').length} colorations, ${items.filter((i) => i.category === 'accessory').length} accessoires).
-- GÉNÉRÉ depuis lib/catalog-data.ts — ne pas éditer à la main.
-- Régénérer : node scripts/generate-seed.mjs
-- Descriptions strictement génériques, aucune marque déposée. Rejouable (upsert sur le slug).

insert into public.catalog_items
  (slug, label, category, style_tags, prompt_template, preview_path, is_premium, sort_order)
values
${rows.join(',\n\n')}

on conflict (slug) do update set
  label = excluded.label,
  category = excluded.category,
  style_tags = excluded.style_tags,
  prompt_template = excluded.prompt_template,
  preview_path = excluded.preview_path,
  is_premium = excluded.is_premium,
  sort_order = excluded.sort_order;
`;

writeFileSync('supabase/migrations/20250101000200_seed_catalog.sql', sql);
console.log(`seed SQL régénéré — ${items.length} entrées`);
