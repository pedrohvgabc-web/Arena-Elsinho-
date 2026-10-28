# Arquitetura
- `src/lib/arena-rules.ts` — regras puras (horários, slots, validação, telefone, fuso America/Cuiaba).
- `src/lib/arena.functions.ts` — server functions públicas (espaços, disponibilidade sem dados pessoais, criar reserva, pedido LGPD) e admin (login, logout, agenda, ações).
- `src/lib/payments.server.ts` — abstração de PSP (modo demo).
- `src/routes/api/public/payments/webhook.ts` — webhook idempotente.
- Rotas: `/`, `/reservar`, `/admin`, `/privacidade`, `/termos`, `/cancelamento`.
- Conflitos: constraint `EXCLUDE USING gist (space_id =, slot &&)` para status pending/paid.
- Não há tabela `users`: o painel usa senha única; para múltiplos administradores, migrar para contas com papéis.
