-- Новий набір Unger із довільною комплектацією.
-- price = 0 означає: сайт показує замовлення в приватних повідомленнях замість кошика.

insert into public.products (
  id, brand, name, name_ru, description, description_ru, short_desc,
  price, currency, category, image_url, images, badge, in_stock,
  variants, bundle_items, product_type, sort_order, active
) values (
  1005,
  'Unger',
  'Обладнання для миття вікон від Unger',
  'Оборудование для мойки окон от Unger',
  'Професійне обладнання Unger для миття вікон. Ви можете самостійно обрати потрібні позиції та сформувати комплект. Ціна готового набору залежить від комплектації. Для замовлення напишіть у приватні повідомлення.',
  'Профессиональное оборудование Unger для мойки окон. Вы можете самостоятельно выбрать нужные позиции и сформировать комплект. Цена готового набора зависит от комплектации. Для заказа напишите в личные сообщения.',
  'Сформуйте власний комплект для миття вікон',
  0,
  'zł',
  'sets',
  null,
  '[]'::jsonb,
  'Комплектація на вибір',
  true,
  null,
  '[
    {"productId":"82","name":"Поворотний згін ErgoTec Ninja, 35 см","nameRu":"Поворотный сгон ErgoTec Ninja, 35 см","amount":"1 шт.","qty":1,"pricePln":160,"priceEur":37.5},
    {"productId":"83","name":"Згін ErgoTec, 35 см","nameRu":"Сгон ErgoTec, 35 см","amount":"1 шт.","qty":1,"pricePln":120,"priceEur":28.5},
    {"productId":"84","name":"Поворотний тримач для шубки Ninja, 35 см","nameRu":"Поворотный держатель для шубки Ninja, 35 см","amount":"1 шт.","qty":1,"pricePln":80,"priceEur":19},
    {"productId":"85","name":"Шубка Monsoon, 35 см","nameRu":"Шубка Monsoon, 35 см","amount":"1 шт.","qty":1,"pricePln":58,"priceEur":13.5},
    {"productId":"86","name":"Скребок ErgoTec, 15 см","nameRu":"Скребок ErgoTec, 15 см","amount":"1 шт.","qty":1,"pricePln":90,"priceEur":21.5},
    {"productId":"87","name":"Запасні леза для скребка, 15 см — 25 шт.","nameRu":"Запасные лезвия для скребка, 15 см — 25 шт.","amount":"25 шт.","qty":1,"pricePln":75,"priceEur":18},
    {"productId":"88","name":"Запасна гумка Soft, 35 см","nameRu":"Запасная резинка Soft, 35 см","amount":"1 шт.","qty":1,"pricePln":14,"priceEur":3.5},
    {"productId":"89","name":"Тримач для пада","nameRu":"Держатель для пада","amount":"1 шт.","qty":1,"pricePln":40,"priceEur":9.5},
    {"productId":"90","name":"Білий пад для видалення забруднень","nameRu":"Белый пад для удаления загрязнений","amount":"1 шт.","qty":1,"pricePln":6,"priceEur":1.4}
  ]'::jsonb,
  'bundle',
  1005,
  true
)
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
  badge = excluded.badge,
  in_stock = excluded.in_stock,
  bundle_items = excluded.bundle_items,
  product_type = excluded.product_type,
  sort_order = excluded.sort_order,
  active = excluded.active;
