# Pagamentos
Métodos: pix, card_onsite, cash_onsite. Estados: pending, paid, cancelled, expired, failed.
- Sem PSP configurado → `provider=demo`, `is_simulated=true`; o cliente vê aviso de modo demonstrativo; nunca vira "pago" automaticamente.
- Pix expira em 30 min (`expires_at`); expirados são marcados ao abrir o painel.
- Admin só marca como pago pagamentos no local.
- Integrar Pix real (Efí, Asaas, Mercado Pago, Pagar.me): implementar `PaymentProvider` (createPix + parseWebhook com verificação de assinatura), selecionar em `getProvider()`, cadastrar chaves como secrets e a URL `/api/public/payments/webhook` no PSP. Idempotência por `payment_webhook_events(provider,event_id)`; conciliação por `payments.provider_ref`.
