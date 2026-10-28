# Arena Elsinho

Site + reservas online + painel administrativo.

- Stack: TanStack Start (React 19, Vite), Tailwind v4, Lovable Cloud (Postgres).
- Instalar: `bun install` · Rodar: `bun run dev` · Testar: `bunx vitest run`
- Secrets: `ADMIN_PASSWORD` (painel `/admin`). Futuro: `PAYMENT_PROVIDER`, chaves do PSP, segredo do webhook.
- Banco: tabelas `arena_spaces`, `bookings`, `payments`, `payment_webhook_events`, `admin_sessions`, `rate_limits`, `audit_logs`, `waitlist`, `privacy_requests`.
- Contatos (WhatsApp, endereço) em `src/lib/site.ts` — preencher.

Veja ARCHITECTURE.md, SECURITY.md, PAYMENTS.md, PRIVACY.md, DESIGN_SYSTEM.md, QA_REPORT.md, FINAL_REVIEW.md.
