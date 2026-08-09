-- CleanTapi Shop: new spot remover and availability update.
-- Run this file once in Supabase SQL Editor after the updated site is deployed.

with uploaded_image as (
  select
    'https://fwjisaaorqubsjkdyidx.supabase.co/storage/v1/object/public/products/' || name as public_url
  from storage.objects
  where bucket_id = 'products'
    and name ilike 'pro_power_spot_remover%'
  order by created_at desc
  limit 1
)
insert into public.products (
  id,
  brand,
  name,
  name_ru,
  description,
  description_ru,
  short_desc,
  price,
  currency,
  category,
  image_url,
  images,
  badge,
  in_stock,
  variants,
  bundle_items,
  product_type,
  sort_order,
  active
)
select
  91,
  'Pro',
  'PRO POWER SPOT REMOVER, 1 л',
  'PRO POWER SPOT REMOVER, 1 л',
  'Дуальний плямовивідник для найскладніших точкових забруднень: одночасно працює як сольвент і м’який лужний очищувач. Видаляє жир, олію, смоли, віск, косметику, креми, білкові та органічні забруднення. Використовується як точковий споттер перед екстракцією або як підсилювач основного пре-спрею на проблемних зонах. Нанесіть на пляму, легко вітріть, витримайте 5–10 хвилин і виполощіть екстрактором. Не допускайте висихання. Підходить для більшості синтетичних тканин, легко виполіскується та не залишає липкості. Перед використанням обов’язково протестуйте на непомітній ділянці. pH 8,5. Об’єм: 1 л.',
  'Дуальный пятновыводитель для самых сложных точечных загрязнений: одновременно работает как сольвент и мягкий щелочной очиститель. Удаляет жир, масло, смолы, воск, косметику, кремы, белковые и органические загрязнения. Используется как точечный споттер перед экстракцией или как усилитель основного пре-спрея на проблемных зонах. Нанесите на пятно, слегка вотрите, выдержите 5–10 минут и промойте экстрактором. Не допускайте высыхания. Подходит для большинства синтетических тканей, легко выполаскивается и не оставляет липкости. Перед использованием обязательно протестируйте на незаметном участке. pH 8,5. Объём: 1 л.',
  'Дуальний споттер для жиру, олії, косметики та органічних плям',
  50,
  'zł',
  'chemistry',
  coalesce(
    (select public_url from uploaded_image),
    'https://fwjisaaorqubsjkdyidx.supabase.co/storage/v1/object/public/products/pro_power_spot_remover'
  ),
  jsonb_build_array(coalesce(
    (select public_url from uploaded_image),
    'https://fwjisaaorqubsjkdyidx.supabase.co/storage/v1/object/public/products/pro_power_spot_remover'
  )),
  'NEW',
  true,
  '[{"size":"1 л","price":50}]'::jsonb,
  null,
  'product',
  91,
  true
on conflict (id) do update set
  brand = excluded.brand,
  name = excluded.name,
  name_ru = excluded.name_ru,
  description = excluded.description,
  description_ru = excluded.description_ru,
  short_desc = excluded.short_desc,
  price = excluded.price,
  currency = excluded.currency,
  category = excluded.category,
  image_url = excluded.image_url,
  images = excluded.images,
  badge = excluded.badge,
  in_stock = excluded.in_stock,
  variants = excluded.variants,
  product_type = excluded.product_type,
  sort_order = excluded.sort_order,
  active = excluded.active;

-- Prochem Stain Pro is confirmed as available.
update public.products
set in_stock = true,
    active = true
where id = 26;

-- Verification: both rows should be returned, with in_stock = true.
select id, brand, name, price, in_stock, active, image_url
from public.products
where id in (26, 91)
order by id;
