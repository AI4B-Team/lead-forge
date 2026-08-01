ALTER TABLE public.user_prefs
  ADD COLUMN IF NOT EXISTS welcome_dismissed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist_collapsed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_clean_list boolean NOT NULL DEFAULT false;

ALTER TABLE public.sending_numbers
  ADD COLUMN IF NOT EXISTS forward_calls_to text,
  ADD COLUMN IF NOT EXISTS voicemail_greeting text;