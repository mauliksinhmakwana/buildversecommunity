
CREATE TABLE public.phone_credentials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL UNIQUE,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX phone_credentials_phone_idx ON public.phone_credentials(phone);
GRANT SELECT ON public.phone_credentials TO authenticated;
GRANT ALL ON public.phone_credentials TO service_role;
ALTER TABLE public.phone_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own phone creds" ON public.phone_credentials FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup','reset')),
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX phone_otps_phone_idx ON public.phone_otps(phone, created_at DESC);
GRANT ALL ON public.phone_otps TO service_role;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon: only service_role (server functions) touches this table.

CREATE OR REPLACE FUNCTION public.touch_phone_credentials()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER phone_credentials_touch BEFORE UPDATE ON public.phone_credentials
FOR EACH ROW EXECUTE FUNCTION public.touch_phone_credentials();
REVOKE EXECUTE ON FUNCTION public.touch_phone_credentials() FROM PUBLIC, anon, authenticated;
