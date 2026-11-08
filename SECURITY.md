# Segurança — Arena Leste Multi Sports

## Controles aplicados
- `DATABASE_URL` e `ADMIN_PASSWORD` permanecem somente em secrets do Web Service Render. O navegador usa server functions e nunca acessa o Neon diretamente.
- Entradas do formulário são validadas no servidor com Zod; queries são parametrizadas. Nomes repetidos, caracteres de marcação e equipes fora do limite são rejeitados.
- `tournament_registrations` é uma tabela isolada, com RLS habilitado e permissões revogadas de `PUBLIC`; não há endpoint de leitura pública. Somente funções `adminTournamentRegistrations` e `adminSetTournamentRegistrationStatus` autorizadas pela sessão administrativa consultam ou alteram dados.
- A pré-inscrição usa chave de idempotência, honeypot, limite de 8 envios por chave de rede por hora e 1 por hora por hash do WhatsApp do capitão. O telefone não aparece na chave de rate limit. Códigos de inscrição são aleatórios; auditoria registra ação/evento sem nomes, telefone ou elenco.
- O painel mantém autenticação em sessão existente: senha em segredo, comparação constante, token aleatório armazenado como hash, cookie HttpOnly/Secure/SameSite=None, expiração de 8h e logout que remove a sessão.
- Os telefones de capitães são mascarados no admin por padrão e revelados apenas após ação explícita. A lista administrativa é limitada às 300 inscrições mais recentes.
- O Static Site declara `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` e `Permissions-Policy` que bloqueia câmera/microfone e permite localização somente para o próprio site e o iframe do Google Maps.
- O proxy `/api/*` do CDN encaminha funções ao backend; formulário e admin continuam protegidos no servidor.

## Limites e manutenção
- A aplicação usa credenciais de servidor do Neon; não crie roles públicos nem grants ao navegador para a nova tabela. O processo deve manter queries somente pelo backend.
- O limite por IP usa cabeçalhos de proxy; mantenha o CDN/backend no proxy atual e não confie em um cabeçalho de IP enviado diretamente pelo cliente sem a sanitização do Render.
- Uma CSP estrita ainda não foi adicionada: revisar scripts/estilos do TanStack, fontes e iframe de mapa antes de ativá-la.
- A migração Neon deve ser testada em branch temporária antes da aplicação no banco principal. A tabela do torneio só deve ser publicada quando a migração existir em produção.
- Não configurar cobranças Pix/Mercado Pago para o torneio; o formulário não recebe pagamento. Nenhum dado ou migração antiga é apagado por esta mudança.
