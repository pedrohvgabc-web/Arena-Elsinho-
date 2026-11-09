# Plano — Arena Leste Multi Sports

## Objetivo e limites

Integrar a nova versão enviada em `arena-leste-projeto.zip` ao site já operacional da Arena Leste, sem trocar a stack TanStack Start/React 19/Vite/Tailwind v4, as duas origens de deploy no Render, o domínio atual ou o PostgreSQL Neon. O ZIP é referência de identidade visual, vídeos, copy, fluxo e módulos; não substituir o app por seu HTML de hash nem portar o `localStorage` inseguro. Preservar o login existente, as oito quadras atuais (quatro por unidade), as reservas legadas e a pré-inscrição do Torneio Novembro Azul. Manter o plano gratuito.

## Design e experiência

- **Design Movement:** reprodução fiel da direção original enviada no ZIP — hero, navegação, fita, campanha, paleta, tipografia, microinterações e módulos — portada para marcação React para que todos os controles continuem funcionais com o banco real.
- **Princípios centrais:** (1) vídeo e copy específicos da Arena como ponto focal; (2) navegação e reserva imediatamente encontráveis; (3) superfícies e módulos administrativos claros, sem transformar tudo em cartões idênticos; (4) mobile, acessibilidade e rapidez desde o primeiro carregamento.
- **Filosofia de cor — 6 valores principais:** papel quente `#FFF9F2` (fundo editorial), branco `#FFFFFF` (superfícies), tinta `#1A1210` (texto de alta leitura), taupe `#6B5F57` (texto secundário), laranja `#DF4F07` (cor proprietária/ações da Arena, com texto escuro nos botões) e azul `#2457D6` (bloco do Novembro Azul, com branco). Para texto pequeno laranja em superfícies claras, usar o tom derivado acessível `#AD4306`; no hero audiovisual, usar superfície derivada navy `#11171E`, texto creme e laranja original nos títulos grandes. Manter verde apenas em WhatsApp e estados de sucesso.
- **Tipografia:** Barlow Condensed 800/itálica para títulos curtos e esportivos; Barlow para leitura, formulários e interface; JetBrains Mono em metadados compactos, códigos e horários. Escala fluida com `clamp()`, parágrafos com largura confortável, títulos `text-wrap: balance` e números tabulares.
- **Paradigma de layout:** faixas e alinhamento à esquerda, com um hero audiovisual assimétrico; linhas editoriais para as duas unidades; campanha destacada como cartaz azul; formulários com uma tarefa por etapa e resumo sticky apenas em telas grandes; o admin usa uma navegação por módulos no desktop e trilho horizontal no celular. Wireframe:

```text
[ faixa Novembro Azul · data · inscrição rolando, parada em movimento reduzido ]
[ logo ] [ Unidades | Torneio | Contato ]                     [ Agendar ]
[ hero: “Bora pra areia?” + contexto Porto Velho | vídeo real + bola interativa ]
[ botões de reserva Unidade 1 / Unidade 2 ]
[ Unidades: duas linhas editoriais + mapa e endereços ]
[ Novembro Azul: vídeo do torneio + countdown + premiação + inscrição ]
[ Instagram / WhatsApp / endereços / rodapé ]

/reservar: 01 Unidade e quadra → 02 Dia → 03 Horário → 04 Seus dados → confirmação
            etapas empilhadas no mobile; resumo lateral no desktop
/admin: módulos (Geral, Agenda e reservas, Quadras e horários, Torneio,
        Contato, Backup, Histórico) → um painel ativo por vez
```

- **Elementos de assinatura:** logo oficial já existente, linhas de quadra em traço laranja, abreviações monoespaçadas em agenda e imagens do esporte fornecidas pelo usuário. Evitar repetição de cards arredondados.
- **Interação:** chamadas de ação levam à reserva interna com unidade pré-selecionada; selecionar hora e receber resposta é direto, com feedback em menos de 100 ms. Mapa e canais sociais permanecem acessíveis; WhatsApp é opcional e não abre o fluxo de reserva.
- **Animação e movimento:** reproduzir intro, bola interativa, fita rolante, reveal e CTA que acompanha o cursor do ZIP; a bola/CTA continuam focáveis e acessíveis ao toque. Vídeos sem áudio, com poster imediato e carregamento sob demanda/visibilidade; ribbon e movimento respeitam `prefers-reduced-motion`. Em movimento reduzido, manter poster estático e conteúdo completo. Nenhuma informação depende de animação para ser compreendida.
- **Essência da marca:** o ponto de encontro de vôlei e esportes de areia de Porto Velho, com duas unidades e reserva direta no site; personalidade ativa, acolhedora e direta.
- **Voz:** português brasileiro coloquial e específico, sem horários ou endereços tratados como confirmados quando não foram. Exemplos: “Bora pra areia?” / “Escolha a unidade e marque seu próximo jogo.”
- **Logo e cor proprietária:** manter o arquivo oficial `src/assets/arena-leste-logo.webp`, que corresponde à identidade do logo menor do ZIP; laranja `#DF4F07` é a assinatura da Arena.

## Integração técnica do ZIP

- Continuar servindo as rotas reais `/`, `/reservar`, `/torneio` e `/admin` pelo TanStack Router. Não copiar o shell `index.html` de três telas com hash; manter SEO, manifesto de rotas, proxy `/api/*`, frontend estático e API Node atuais.
- Copiar o CSS original do ZIP para `src/arena-zip.css` e reproduzir sua estrutura e copy nas rotas React com componentes acessíveis; não carregar o HTML/JavaScript legado como scripts nem usar o `localStorage` do protótipo.
- Aparar os primeiros 1,25 s do clipe do hero, que mostram contatos antigos, e usar poster limpo. Incluir também o vídeo de campeonato de 60 fps no bloco Novembro Azul e em sua página; uma tarja de marca cobre a placa/telefone antigo sem ocultar o atleta. Publicar apenas os derivados comprimidos em `public/videos/` e seus posters leves em `public/images/`; os originais do ZIP permanecem intactos. Manter `preload=none`, reprodução sob `IntersectionObserver`, sem áudio e poster estático para movimento reduzido.
- Reimplementar o agendamento como wizard de quatro etapas (unidade/quadra, dia, horário, dados e pagamento), mantendo seleção entre as quatro quadras disponíveis em cada unidade, observações opcionais, horários/preços do Neon, validação final no servidor, idempotência, conflito transacional, Pix demonstrativo e confirmação no próprio site.
- Organizar o painel autenticado em módulos React. Reutilizar as APIs existentes para reservas atuais, quadras, grade semanal, torneio e histórico; acrescentar cópia autenticada da grade semanal entre unidades e exportação JSON de backup somente para admin. Manter contatos e dados do evento que são fonte oficial como leitura; preço, estado/nome/duração das quadras e janelas semanais editáveis no admin.
- O protótipo local do ZIP permite `localStorage`, importação livre, apagar todos os registros e restaurar dados de exemplo. Não copiar esses controles destrutivos para produção: importar ou zerar reservas reais pode prejudicar clientes. O módulo de backup no site real será exportação; cancelamentos individuais/de grupo continuam disponíveis com confirmação.
- Sem migração de banco nesta adaptação: usar `0003_arena_units_and_hours.sql`, as oito quadras já criadas e a tabela `tournament_registrations` existentes. Novas funções de exportação/cópia passam por `requireAdmin()`, SQL parametrizado e auditoria; dados pessoais continuam restritos ao painel autenticado.

## Reservas e regras

- O visitante inicia e conclui a reserva dentro do site. WhatsApp aparece apenas como canal opcional, especialmente após a gravação; não redirecionar no primeiro passo.
- O público vê somente quadras ativas com preço configurado e slots permitidos pela grade semanal. As configurações atuais da base começam fechadas e sem preço para não inventar valores ou horários da Arena.
- Atividade comunicada: vôlei de praia. Observações podem informar outra atividade própria para areia, sem promover modalidade oficial não confirmada.
- Não alterar a lógica existente do Torneio Novembro Azul nem seu formulário/tabela: data de 28/11/2026 às 15h, quarteto masculino, R$150 por equipe, até seis integrantes contando o capitão, premiação de R$800/R$400/R$200 com troféu e medalhas, sem cobrança online.

## Segurança e continuidade

- Reusar sessão admin HttpOnly/Secure, `requireAdmin()`, queries parametrizadas, schemas Zod, rate limit, auditoria, idempotência e validação final de conflito. Nenhum endpoint público retorna dados pessoais.
- Manter `/api/*` no Web Service Node e banco/segredos só no servidor; não expor contatos antigos que aparecem no material audiovisual.
- Manter Render/Neon nos planos atuais, domínio e endpoints existentes; otimizar assets para não aumentar o carregamento inicial.

## Estrutura principal

- `src/routes/index.tsx`: home editorial, hero, ribbon, torneio, unidades e mapa.
- `src/routes/reservar.tsx`: wizard online de quatro etapas conectado a `getSpaces`, `getAvailability` e `createBooking`.
- `src/routes/admin.tsx`: sessão e navegação modular; arquivo legado claramente separado e contato oficial somente leitura.
- `src/lib/admin-navigation.ts`: lista tipada dos sete módulos administrativos e seus ícones.
- `src/components/AdminOverview.tsx`: indicadores reais e atalhos da operação.
- `src/components/CurrentBookingsAdmin.tsx`: agenda diária, busca, filtro de status e ações em grupos.
- `src/components/ArenaSettingsAdmin.tsx`: edição de quadras, preços, duração, ativação e grade semanal.
- `src/components/AdminDataBackup.tsx`: exportação autenticada e explícita de JSON com alerta de dados pessoais.
- `src/components/TournamentRegistrationsAdmin.tsx`: listagem autenticada e atualização de status das pré-inscrições.
- `src/components/LazyLoopVideo.tsx`: poster imediato e reprodução adiada dos vídeos de hero e campanha.
- `src/components/TournamentCountdown.tsx`: countdown compartilhado entre a home e a página do evento, com data ISO centralizada.
- `src/lib/arena.functions.ts`: server functions de disponibilidade, gravação, admin, cópia de grade e backup exportável.
- `src/lib/arena-rules.ts`: fuso, slots e validações compartilhadas.
- `src/lib/site.ts`: identidade, unidades, canais e conteúdo oficial da campanha.
- `public/videos/` e `public/images/`: versões tratadas dos assets enviados, sem introduzir contatos desatualizados.
- `drizzle/migrations/0003_arena_units_and_hours.sql`: catálogo de quadras/grade já aplicado; nenhuma nova migração planejada.
- `src/styles.css`, `vite.config.ts` e `vite.static.config.ts`: tokens, estilos e builds atuais dos serviços Render.
