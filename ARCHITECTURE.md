# Arquitetura — Arena Leste Multi Sports

- **Frontend:** TanStack Start, React 19, Vite e Tailwind v4. O Render Static Site publica `dist/client`; a home usa conteúdo local/estático e não espera o backend para aparecer.
- **Backend:** Web Service Node Render existente, acessado pelo rewrite `/api/*` do Static Site. O servidor usa Neon por `DATABASE_URL`; nenhuma credencial do banco vai ao navegador.
- **Identidade/contatos:** `src/lib/site.ts` concentra nome, WhatsApp, Instagram, torneio, unidades, rotas e URLs de mapa.
- **Mapa:** componente `src/components/UnitMap.tsx`, iframe de busca interativo do Google Maps sem chave de Maps API e link de abertura externa. O endereço da Unidade 2 pode estar aproximado; confirmação manual é recomendada.
- **Agendamentos novos:** `/reservar` cria conversas WhatsApp específicas para cada unidade. Não usa os preços/horários do catálogo legado como disponibilidade oficial.
- **Torneio:** `/torneio` valida a equipe no browser e, obrigatoriamente, no servidor. `registerTournamentTeam` aplica schema, telefone, limite e idempotência, e persiste nomes/WhatsApp no Neon.
- **Admin:** `/admin` reaproveita autenticação e sessão existentes. `TournamentRegistrationsAdmin` consulta/atualiza o status de até 300 pré-inscrições por funções que exigem sessão. Contatos são mascarados. A seção de reservas antigas é recolhida e rotulada como arquivo histórico.
- **Banco:** migrações versionadas em `drizzle/migrations/`. `0002_tournament_registrations.sql` cria tabela própria com elenco em JSONB, status, código, chave de idempotência, índices e RLS; nenhuma migração remove as tabelas antigas.
- **Pagamentos:** o torneio não cobra online. A inscrição publicada é uma pré-inscrição que requer confirmação manual; fluxo antigo de Pix permanece demonstrativo/não usado pelo novo agendamento.
- **Privacidade:** `src/routes/privacidade.tsx` descreve dados mínimos, finalidade e canal de direitos LGPD.

## Regras de negócio
- Arena Leste 1: Rua Jequié, 6820, Cuniã, Porto Velho/RO (atrás da Academia de Sena, conforme perfil oficial).
- Arena Leste 2: Avenida Pinheiro Machado, 6706, Porto Velho/RO conforme bio atual compartilhada; alguns posts antigos citam 6705/6686. O site sinaliza divergência e não promete ponto exato.
- Torneio Novembro Azul: quarteto masculino, 28 de novembro de 2026 às 15h, local ainda a confirmar, R$150/equipe. Prêmios: R$800, R$400 e R$200; todos com troféu e medalhas. Limite de 4–6 atletas, capitão incluído.
