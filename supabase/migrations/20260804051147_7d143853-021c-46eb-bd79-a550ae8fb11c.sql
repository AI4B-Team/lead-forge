CREATE TABLE public.cron_locks (
  key text PRIMARY KEY,
  locked_at timestamptz NOT NULL DEFAULT now(),
  last_tick_at timestamptz
);
GRANT ALL ON public.cron_locks TO service_role;
ALTER TABLE public.cron_locks ENABLE ROW LEVEL SECURITY;

-- Atomic ledger insert + balance update in one transaction.
CREATE OR REPLACE FUNCTION public.apply_credit_delta(
  _workspace_id uuid,
  _kind text,
  _delta integer,
  _reason text,
  _job_id uuid DEFAULT NULL,
  _actor_user_id uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
BEGIN
  INSERT INTO public.credit_balances (workspace_id, kind, balance)
  VALUES (_workspace_id, _kind, 0)
  ON CONFLICT (workspace_id, kind) DO NOTHING;

  -- Row lock serialises concurrent debits for this workspace+kind.
  SELECT balance INTO v_balance
  FROM public.credit_balances
  WHERE workspace_id = _workspace_id AND kind = _kind
  FOR UPDATE;

  IF _delta < 0 AND v_balance + _delta < 0 THEN
    RAISE EXCEPTION 'Insufficient % credits: balance %, requested %', _kind, v_balance, abs(_delta)
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.credit_balances
  SET balance = v_balance + _delta, updated_at = now()
  WHERE workspace_id = _workspace_id AND kind = _kind
  RETURNING balance INTO v_balance;

  INSERT INTO public.credit_ledger (workspace_id, kind, delta, reason, job_id, actor_user_id)
  VALUES (_workspace_id, _kind, _delta, _reason, _job_id, _actor_user_id);

  RETURN v_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_credit_delta(uuid, text, integer, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_credit_delta(uuid, text, integer, text, uuid, uuid) TO service_role, authenticated;

-- Claim a cron tick only when the previous run is older than _min_interval.
CREATE OR REPLACE FUNCTION public.claim_cron_tick(_key text, _min_interval interval DEFAULT '30 seconds')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed boolean := false;
BEGIN
  INSERT INTO public.cron_locks (key, last_tick_at)
  VALUES (_key, now())
  ON CONFLICT (key) DO UPDATE
    SET last_tick_at = now(), locked_at = now()
    WHERE public.cron_locks.last_tick_at IS NULL
       OR public.cron_locks.last_tick_at < now() - _min_interval
  RETURNING true INTO v_claimed;

  RETURN coalesce(v_claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_cron_tick(text, interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_cron_tick(text, interval) TO service_role;