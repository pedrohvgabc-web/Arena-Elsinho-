# Plano — Arena Leste Multi Sports

## Objetivo e limites
Reativar reservas dentro do site para as duas unidades da Arena Leste, com quatro quadras de areia por unidade. Manter a stack TanStack Start/React 19/Vite/Tailwind v4, frontend estático no Render CDN, APIs Node no Render, PostgreSQL Neon, domínio atual e plano gratuito. Preservar a pré-inscrição do Torneio Novembro Azul e o histórico de reservas legado. Não reclassificar os espaços antigos de futebol como quadras atuais, nem copiar seus preços ou horários para a Arena Leste.

## Direção de design
- **Movimento visual:** editorial esportivo de clube de praia ao entardecer, com hierarquia de cartaz e acabamento contemporâneo; não usar aparência genérica de dashboard ou repetição de cards.
- **Princípios:** prioridade à ação de reservar; fotografia realista e conteúdo específico da Arena; leitura imediata em celular; interface administrativa clara e discreta.
- **Paleta (6 valores):** carvão azulado `#121820` (base), ardósia `#1C2530` (superfície), areia clara `#F4F1E8` (texto), laranja de assinatura `#F27432` (ação e energia), azul acessível derivado da marca `#218DB9` (orientação e detalhes), cinza-azulado `#A9B5C1` (texto secundário). Manter o verde reconhecível apenas para ações WhatsApp e estados de sucesso.
- **Layout:** home editorial assimétrica; texto alinhado à esquerda sobre base escura e fotografia de vôlei ao entardecer no hero, com a bola interativa já existente como assinatura visual sem competir com a foto. Mapa e endereços permanecem em suas seções próprias. A rota `/reservar` passa a ser um fluxo sequencial com resumo lateral em desktop e etapas empilhadas em mobile. O admin separa inscrições do torneio, configurações operacionais e arquivo legado.
- **Elementos de marca:** placa da logo original; linhas de quadra/rede; foto do hero em WebP já disponível e arte promocional do torneio já disponível.
- **Interação e movimento:** manter exatamente as animações existentes de bola, marquee, ribbon, jelly, pop, reveal e hover, incluindo as regras de movimento reduzido. Não alterar suas definições em `styles.css` nem a lógica de `motion.tsx`. Reutilizar `.animate-pop` e `.btn-jelly` existentes para a transição de estado; novos estados usam feedback imediato e acessível, sem introduzir novas coreografias.
- **Tipografia:** manter Barlow Condensed nos títulos e Manrope em leitura/formulários. Títulos concisos e equilibrados; corpo confortável, foco visível e alvos de toque com pelo menos 44 px.
- **Essência da marca:** ponto de encontro de vôlei e esportes de areia em Porto Velho, com duas unidades e reserva feita no próprio site. Personalidade: ativa, acolhedora, direta.
- **Voz:** convite coloquial e específico, sem promessas não confirmadas. Exemplos: “Escolha sua quadra e marque o próximo jogo.” / “Horários e valores atualizados pela equipe da Arena.”
- **Logo e cor proprietária:** manter o arquivo original e sua placa clara no cabeçalho; laranja `#F27432` como cor própria, com azul da logo somente como acento secundário.

## Reservas e regras
- `/reservar` permite selecionar uma unidade, uma das quatro quadras da unidade, data, horários disponíveis, dados do responsável e forma de pagamento já suportada pelo sistema. O começo e a conclusão do fluxo ocorrem no site; o WhatsApp não é um redirecionamento inicial obrigatório.
- O visitante vê apenas quadras ativas, preço configurado, horários da unidade para aquele dia e conflitos atualizados. Reservas são gravadas no Neon por server function; a constraint de não sobreposição, validação no servidor e idempotência permanecem como proteções finais. A confirmação existente e o Pix demonstrativo continuam sem integração de cobrança real.
- Cada espaço recebe `unit_id` para separar as quatro quadras da Unidade 1 e as quatro da Unidade 2. Atividade de destaque é vôlei de praia; um campo de observações pode registrar outra atividade de areia solicitada pelo cliente, sem afirmar novas modalidades oficiais.
- Horários semanais são guardados por unidade e dia da semana, com suporte a unidade fechada e até dois intervalos. A grade real e os preços atuais ainda não foram confirmados; não inventar valores nem reaproveitar a tabela antiga. O painel permite preenchê-los antes de ativar espaços para reserva pública.
- O painel admin permite editar nome/identificação, preço, duração e ativação por quadra, agrupadas por unidade; também permite ajustar a grade semanal. A administração de reservas atuais por data é separada do arquivo legado. Toda alteração requer a sessão autenticada, passa por validação server-side e gera auditoria em `audit_logs`.
- A migração aditiva `0003` foi validada em branch temporária e aplicada à Neon de produção após autorização. Ela acrescentou `unit_id`, a grade semanal e oito espaços novos inativos/sem preço; os registros legados e a tabela do torneio foram preservados. Novas reservas públicas só aparecem depois de definir preços e horários válidos.

## Preservação de marca, campanhas e localização
- `src/lib/site.ts` continua sendo a fonte central da marca, WhatsApp, Instagram, endereços e dados do torneio.
- Manter os endereços publicados e a observação de que a numeração da Unidade 2 deve ser confirmada pela Arena; mapas incorporados continuam usando Google Maps sem chave de API.
- Não alterar o formulário existente do Torneio Novembro Azul, sua validação ou tabela Neon; preservar a pré-inscrição, premiação e contato da organização.

## Segurança e dados
- Reusar sessão admin HttpOnly/Secure, `requireAdmin()`, queries parametrizadas e validação Zod no servidor. Nenhum endpoint público expõe dados pessoais de reservas; disponibilidade retorna somente horários e estado de ocupação.
- Aplicar controles na criação de reserva: rate limit já existente, telefone validado, chave de idempotência, prazo Pix demonstrativo e confirmação de conflito na transação. Atualização de preço, ativação de quadra e horários requer autenticação e auditoria.
- Seguir a arquitetura existente: frontend estático independe do backend; `/api/*` continua no Web Service Node; database DSN permanece somente no servidor. Não modificar plano, domínio, segredo ou roteamento atual do Render.

## Estrutura relevante do projeto
- `src/routes/index.tsx`: home, hero, torneio, unidades e mapa.
- `src/routes/reservar.tsx`: fluxo público de reserva por unidade, quadra, data, horário e contato.
- `src/routes/admin.tsx`, `src/components/CurrentBookingsAdmin.tsx`, `src/components/ArenaSettingsAdmin.tsx` e `src/components/TournamentRegistrationsAdmin.tsx`: autenticação, reservas atuais, configuração de quadras/horários e inscrições; manter o arquivo legado separado.
- `src/lib/arena.functions.ts`: server functions públicas/admin, disponibilidade e gravação de reserva.
- `src/lib/arena-rules.ts`: fuso, cálculo de slots, validações e formatos compartilhados.
- `src/lib/site.ts`: identidade, endereços, contatos e conteúdo da campanha.
- `drizzle/migrations/`: migração incremental das unidades e horários.
- `src/styles.css`: tokens de aparência e animações existentes; ajustar tokens e estilos de layout, sem alterar keyframes ou coreografia existente.
- `public/images/`: logo, hero WebP e imagem do torneio já disponíveis.
- `vite.config.ts` e `vite.static.config.ts`: builds atuais do runtime Node e do Static Site do Render.
