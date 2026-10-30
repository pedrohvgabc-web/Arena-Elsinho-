# Arena Elsinho

Site de apresentação, reservas online e painel administrativo da Arena Elsinho.

## Stack e execução

- TanStack Start, React 19, Vite e Tailwind v4.
- PostgreSQL no Neon, conectado somente pelo servidor via `DATABASE_URL`.
- Instalação: `pnpm install` · Desenvolvimento: `pnpm dev` · Testes: `pnpm test` · Build: `pnpm build` · Produção Node: `pnpm start`.

## Configuração

- `DATABASE_URL`: connection string do banco Neon `neondb`; mantenha-a como segredo de ambiente e não a publique no GitHub.
- `ADMIN_PASSWORD`: senha forte do painel `/admin`; mantenha-a somente no provedor de hospedagem.
- `MERCADOPAGO_ACCESS_TOKEN` (opcional): ativa cobranças Pix reais e confirmação por webhook. Sem esse token, o Pix é demonstrativo e não confirma pagamentos.
- Os contatos e endereço exibidos no site ficam em `src/lib/site.ts`.

O schema PostgreSQL está em `drizzle/migrations/` e deve ser aplicado na ordem do journal (`0000_migration`, depois `0001_booking_group_code`). A aplicação usa uma conexão server-side; não conceda acesso ao banco diretamente ao navegador.

Veja também `ARCHITECTURE.md`, `SECURITY.md`, `PAYMENTS.md`, `PRIVACY.md`, `DESIGN_SYSTEM.md`, `QA_REPORT.md` e `FINAL_REVIEW.md`.
