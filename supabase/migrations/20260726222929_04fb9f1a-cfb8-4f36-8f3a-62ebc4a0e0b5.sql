alter table public.sending_numbers add column if not exists activated_at timestamptz not null default now();
alter table public.messages add column if not exists provider_sid text;
alter table public.messages add column if not exists error_code text;
create index if not exists messages_provider_sid_idx on public.messages (provider_sid) where provider_sid is not null;
create index if not exists messages_sending_number_day_idx on public.messages (sending_number_id, created_at desc) where direction = 'outbound';