# Plano — Arena Leste Multi Sports

## Objetivo
Reformar o site existente para Arena Leste Multi Sports mantendo o endereço gratuito atual, o frontend estático no Render CDN, as server functions Node, o Neon e a senha de admin. A apresentação pública muda para esporte de areia, duas unidades e Torneio Novembro Azul.

## Direção visual
- Estética de cartaz esportivo editorial: laranja da logo, carvão, areia clara e branco; tipografia Barlow Condensed para impacto e Manrope para leitura.
- Hero assimétrico com uma bola vetorial interativa que o visitante pode girar, linhas inspiradas em quadra/rede e microinterações suaves.
- Faixa fina e clicável do campeonato na parte superior, com movimento que respeita `prefers-reduced-motion`.
- Seções de modalidade, campanha, unidades/mapa e Instagram; layouts mobile-first.
- A logo enviada é preservada como arte original; o cabeçalho mostra sua placa branca com um WebP recortado das margens, e o favicon continua usando o original.
- A imagem de praia gerada é uma ilustração temporária para o campeonato, marcada como ilustrativa; não representa o estabelecimento. Substituir quando o proprietário enviar fotos/arte oficiais.

## Funcionalidade
- `src/lib/site.ts` é a fonte central para marca, WhatsApp oficial, perfil Instagram, links oficiais e duas unidades.
- `/reservar` mostra um botão separado por unidade, abre uma conversa pré-preenchida pelo WhatsApp e não promete disponibilidade automática.
- A seção de unidades permite selecionar Unidade 1 ou 2 e ver um mapa interativo Google Maps por query incorporada, sem chave de Maps API. A busca é aproximada; o mapa e a rota externa também podem ser abertos.
- Unidade 1: Rua Jequié, 6820, bairro Cuniã, Porto Velho/RO, atrás da Academia de Sena segundo o perfil.
- Unidade 2: Avenida Pinheiro Machado, 6706, Porto Velho/RO conforme a bio atual informada; posts antigos mencionam 6705/6686, então o site orienta confirmar antes de sair.
- `/torneio`: quarteto masculino, 28/11/2026 às 15h, local a confirmar, inscrição de R$150/equipe, prêmios R$800/R$400/R$200 com troféu e medalhas. O envio é pré-inscrição, sem pagamento no site; a organização confirma pelo WhatsApp.
- O formulário registra capitão, telefone, equipe opcional e 3–5 outros atletas (4–6 totais), consentimento e chave de idempotência. Nomes repetidos e dados inválidos são rejeitados.
- Admin autenticado possui quadro separado de pré-inscrições, com contatos mascarados por padrão e status pendente/confirmada/cancelada. Reservas antigas continuam no banco, recolhidas em um arquivo e identificadas como histórico.

## Segurança e dados
- Nova tabela PostgreSQL isolada `tournament_registrations`, RLS habilitado, sem leitura pública e acesso só por server functions; migração `0002_tournament_registrations.sql` é incremental e não apaga dados anteriores.
- Validação Zod no servidor, queries parametrizadas, honeypot, limite 8 envios por chave de rede/hora e 1 por hora por hash do WhatsApp do capitão, idempotência e auditoria sem dados pessoais.
- Admin reutiliza senha em segredo, sessão HttpOnly/Secure existente e verificação server-side. Cabeçalhos básicos defensivos configurados no Blueprint Render.
- A página inicial não depende do backend; a SPA permanece no Static Site gratuito e `/api/*` é encaminhado ao Web Service Node existente. Não alterar plano, subdomínio nem segredo de conexão.

## Próximas dependências
A publicação do formulário depende de aplicar a migração Neon após teste em branch temporária e aprovação explícita da estrutura. Fotos reais e arte da camisa aguardam envio do usuário. O endereço/pino da Unidade 2 e o local do torneio devem ser confirmados pela Arena.
