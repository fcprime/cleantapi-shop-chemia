# Оновлення мобільних карток і сортування хімії

## Що змінено

- Картки підбору за типом забруднення на телефоні стали компактнішими.
- Горизонтальний свайп карток збережено.
- У головному списку «Хімія» першими показуються:
  1. Global Enzym
  2. Global Extraction
  3. Global Acid Ocean
  4. Global Finish
  5. Global OxyGo
- У кінець списку опускаються:
  - Koch Chemie Pol Star
  - Koch Chemie Mehrzweckreiniger (MZR)
  - Koch Chemie Leather Star
  - Clinex Anti Spot
  - World of Clean Rust Remover
- Товари, яких немає в наявності, як і раніше, завжди показуються після доступних.

## Як оновити сайт

Замініть файли репозиторію вмістом архіву, а потім виконайте:

```bash
git add .
git commit -m "Compact mobile problem cards and reorder chemistry"
git push
```

Supabase для цього оновлення запускати не потрібно.
