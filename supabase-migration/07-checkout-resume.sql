-- CleanTapi Shop: preserve checkout fields when Telegram opens the store in a new mobile window.
-- Run once in Supabase SQL Editor after migration 06.

alter table public.telegram_verifications
  add column if not exists checkout_draft jsonb;

comment on column public.telegram_verifications.checkout_draft is
  'Short-lived checkout draft used only to restore the form after Telegram verification.';

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'telegram_verifications'
  and column_name = 'checkout_draft';
