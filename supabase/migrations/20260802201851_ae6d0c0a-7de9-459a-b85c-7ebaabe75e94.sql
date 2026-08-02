ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS call_event text,
  ADD COLUMN IF NOT EXISTS recording_url text,
  ADD COLUMN IF NOT EXISTS recording_seconds integer,
  ADD COLUMN IF NOT EXISTS transcript text;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_channel_check CHECK (channel IN ('sms','voice'));

ALTER TABLE public.messages
  ADD CONSTRAINT messages_call_event_check CHECK (call_event IS NULL OR call_event IN ('voicemail','missed','answered','forwarded'));

CREATE INDEX IF NOT EXISTS messages_channel_idx ON public.messages (workspace_id, channel);

ALTER TABLE public.sending_numbers
  ADD COLUMN IF NOT EXISTS recording_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recording_disclosure boolean NOT NULL DEFAULT false;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS forward_calls_to text;