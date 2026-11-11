-- InfinitePay Checkout: links hospedados e identificadores necessários para payment_check.
-- Não armazena API keys, dados de cartão, CPF ou endereço no registro de pagamento.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS checkout_url text,
  ADD COLUMN IF NOT EXISTS transaction_nsu text,
  ADD COLUMN IF NOT EXISTS invoice_slug text,
  ADD COLUMN IF NOT EXISTS capture_method text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_transaction_nsu_idx
  ON public.payments (provider, transaction_nsu)
  WHERE transaction_nsu IS NOT NULL;

ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'demo'
    CHECK (payment_provider IN ('demo', 'infinitepay')),
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'cancelled', 'refunded', 'expired', 'failed')),
  ADD COLUMN IF NOT EXISTS payment_order_nsu text,
  ADD COLUMN IF NOT EXISTS payment_checkout_url text,
  ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_amount_cents integer NOT NULL DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS payment_capture_method text,
  ADD COLUMN IF NOT EXISTS payment_transaction_nsu text,
  ADD COLUMN IF NOT EXISTS payment_invoice_slug text,
  ADD COLUMN IF NOT EXISTS payment_paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS tournament_registrations_payment_order_nsu_idx
  ON public.tournament_registrations (payment_order_nsu)
  WHERE payment_order_nsu IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tournament_registrations_payment_transaction_nsu_idx
  ON public.tournament_registrations (payment_transaction_nsu)
  WHERE payment_transaction_nsu IS NOT NULL;
CREATE INDEX IF NOT EXISTS tournament_registrations_payment_status_created_idx
  ON public.tournament_registrations (payment_status, created_at DESC);
