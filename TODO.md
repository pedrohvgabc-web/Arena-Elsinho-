# Entregas — Arena Leste

## Concluído antes do ZIP

- [x] **Identidade da Arena Leste em todas as páginas públicas** — substituir Arena Elsinho por Arena Leste Multi Sports; atualizar logo recebida, favicon, títulos e descrições; trocar o verde pela paleta laranja; retirar textos e imagens da antiga arena; atualizar WhatsApp para (69) 99356-6796 e Instagram para @arenalesteoficial em cabeçalho, rodapé, links flutuantes, formulários e metadados.
- [x] **Unidades, endereços e mapa** — apresentar Arena Leste 1 na Rua Jequié, 6820, bairro Cuniã, Porto Velho/RO; apresentar Arena Leste 2 na Avenida Pinheiro Machado, número 6706, Porto Velho/RO, deixando claro que a localização/número da segunda unidade precisa de confirmação da própria Arena; mostrar mapa interativo com marcador e troca de unidade.
- [x] **Agendamento online para as duas unidades** — fluxo no próprio site, sem iniciar pelo WhatsApp; permite selecionar Unidade 1 ou 2, uma das quatro quadras correspondentes, data e um ou mais horários livres, dados do responsável e pagamento suportado; grava todos os horários de uma solicitação em uma única transação no Neon, com validação server-side, idempotência, checagem de conflito e confirmação; exibe o total e todos os horários; WhatsApp opcional. A disponibilidade pública só abre depois que a equipe preencher preço e horário.
- [x] **Catálogo com oito quadras atuais** — oito novos espaços na Neon, quatro por unidade, com vôlei de praia como atividade principal; observações permitem informar outra atividade apropriada para areia sem anunciar novas modalidades oficiais; não reaproveitar preços ou espaços antigos; preservar integralmente as reservas legadas. As quadras começam inativas e sem preço até a configuração administrativa.
- [x] **Administração operacional** — no painel autenticado, editar nome, preço, duração e ativação por quadra; consultar reservas atuais agrupadas por data, com ações para confirmar ou cancelar todo o grupo; manter o arquivo antigo de reservas separado; validar alterações no servidor e registrar auditoria.
- [x] **Grade semanal configurável no admin** — editar a grade de cada unidade, marcar dias fechados e configurar até dois intervalos por dia; disponibilidade e validação final usam a grade gravada. A grade foi criada inicialmente fechada, sem inventar os horários da Arena Leste.
- [x] **Primeiro refinamento UI/UX** — aplicar carvão/areia, laranja de marca e azul secundário com contraste acessível; preservar a bola interativa e as animações existentes; manter foco visível, movimento reduzido e layout responsivo.
- [x] **Pré-inscrição do campeonato** — página Torneio Novembro Azul, formulário online para exatamente quatro pessoas (capitão + três atletas), solicitando somente o primeiro nome de cada participante, R$150 por equipe, premiação de R$800/R$400/R$200 com troféus e medalhas, e armazenamento separado no Neon.
- [x] **Admin do torneio e reservas** — exigir a sessão autenticada existente; listar e atualizar inscrições do torneio em área própria; administrar reservas atuais das novas quadras sem misturá-las ao arquivo antigo; auditar ações e não expor dados pessoais publicamente.
- [x] **Migração incremental para quadras e horários** — migração `0003` validada em branch temporária e aplicada à Neon de produção após autorização; criou os oito novos espaços e as grades fechadas sem apagar ou reescrever reservas históricas nem alterar a tabela do torneio.
- [x] **Segurança e plataforma** — validação server-side, rate limit, idempotência e checagem de conflitos; dados privados protegidos por funções autenticadas; manter Render/Neon e checkout real desligado até aplicar a migração e adicionar os segredos do servidor.

## Integração do ZIP concluída

- [x] **Adaptar o ZIP ao app real sem trocar a arquitetura** — copiar o CSS original e transferir hierarquia, copy, vídeos, fita informativa e organização modular para as rotas React `/`, `/reservar`, `/torneio` e `/admin`; manter TanStack Start, chamadas server-side, proxy, `manus-routes.json`, Render e Neon; não carregar a navegação hash nem o código cru/localStorage do protótipo.
- [x] **Usar os vídeos do usuário com leveza** — aparar a abertura do clipe do hero que mostra contatos antigos e gerar poster limpo; incluir o vídeo original do Novembro Azul de 19,8 s/60 fps sem a tarja azul em tela cheia que encobria a ação; retocar somente o telefone antigo da placa original e manter título, data e CTA na interface, fora do vídeo. Hero H.264, 960×540, 8,5 s, sem áudio; clipe do torneio H.264, 960×540, 19,8 s, 60 fps, sem áudio, cerca de 1,72 MB; poster de ação de cerca de 50 KB; reprodução próxima/visível e desativada para movimento reduzido/economia de dados. Os originais do ZIP permanecem intactos.
- [x] **Reserva com progressão visual do ZIP** — unidade/quadra, dia, horário e dados/pagamento em quatro blocos progressivos; cada parte fica travada até a anterior ter seleção válida, conforme o protótipo; manter quatro quadras por unidade, atualização de disponibilidade, resumo, confirmação online, WhatsApp opcional, validação e gravação transacional existentes.
- [x] **Painel admin modular inspirado no ZIP** — visão geral, agenda diária, pesquisa de reservas das quadras atuais nos próximos 60 dias com filtros, quadras/horários, torneio, contato oficial somente leitura, backup e histórico; um painel ativo por vez; manter login e ações no Neon, fornecer cópia de grade entre unidades; preservar o arquivo legado e seus registros.
- [x] **Backup de produção seguro** — exportação JSON autenticada com confirmação, limite de tentativas, auditoria e aviso explícito sobre dados pessoais; não portar importação livre, apagar tudo ou restauração de amostras do `localStorage` para a produção; manter cancelamento individual/de grupo existente.
- [x] **Acabamento fiel ao ZIP** — usar layout, fita rolante, contagem regressiva ao Torneio Novembro Azul (28/11/2026 às 15h), hero em vídeo, botão que acompanha o cursor, bola e animações originais; Barlow/Barlow Condensed/JetBrains Mono, laranja da Arena e azul do evento; preservar acessibilidade, desempenho e movimento reduzido.

## Horários, feriados e pedido especial

- [x] **Ajustar a grade semanal das duas unidades** — segunda a sexta, 19h até 00h; sábado e domingo, 08h até 00h (o fechamento pode terminar à meia-noite).
- [x] **Reconhecer feriados aplicáveis em Porto Velho/RO** — identificar feriados nacionais, o feriado estadual de Rondônia e os feriados municipais de Porto Velho; distingui-los dos pontos facultativos; permitir que o admin defina uma grade especial ou marque a unidade fechada numa data; fazer a disponibilidade pública e a validação no servidor respeitarem a exceção.
- [x] **Oferecer negociação de horário diferenciado na landing page** — abaixo da seleção de unidade, exibir “Quero fazer reserva de um horário diferenciado!” e abrir o WhatsApp oficial com essa mensagem pronta.
- [x] **Permitir adicionar quadras no admin** — o admin pode criar quadras adicionais na unidade selecionada, até 12 por unidade; a nova quadra começa inativa e sem preço até ser configurada, e só passa a aparecer na reserva pública após receber um preço válido e ser ativada.

## Dados comerciais que continuam pendentes

- [ ] **Completar a disponibilidade pública da Unidade 2** — as quatro quadras da Unidade 1 já estão ativas e com preço; as quatro quadras da Unidade 2 ainda precisam ser ativadas e precificadas no painel. A grade semanal das duas unidades foi configurada em novembro de 2026.
- [ ] **Confirmar dados locais** — validar com a Arena o endereço/pino da Unidade 2, o local do torneio e qualquer alteração de contato antes de publicar informação diferente da fonte oficial.
- [x] **Etapa Pix demonstrativa no sucesso da pré-inscrição** — mostrar o valor de R$ 150 por equipe e um payload copiável retornado pelo provedor demonstrativo; avisar que o código não é Pix bancário, não movimenta dinheiro e não confirma pagamento; manter confirmação dos próximos passos com a organização pelo WhatsApp.

## Reserva: promoção, dados e alinhamento do hero

- [x] **Aplicar a promoção por duração real** — exibir o benefício e calcular no servidor R$ 50/h quando a duração total reservada ultrapassar 60 minutos; dois blocos de 30 minutos somam exatamente uma hora e não recebem o desconto; usar tarifa normal de R$ 60/h, salvo valor administrativo diferente.
- [x] **Centralizar a bola/CTA do hero no cursor** — fazer o centro visual acompanhar o ponteiro, respeitando contêiner, telas móveis e movimento reduzido.
- [x] **Exigir endereço, CPF e confirmação de uso** — validar os dados no servidor, exigir consentimento e registrar a confirmação junto à reserva.
- [x] **Atualizar a Política de Privacidade** — descrever coleta de CPF/endereço, proteger os campos das respostas públicas/WhatsApp e explicar que não são enviados ao checkout.
- [x] **Implementar checkout InfinitePay para reservas e torneio** — links únicos Pix/cartão criados no servidor; montante em centavos derivado das regras server-side; retorno e webhook consultam `payment_check`, conferem valor exato, deduplicam eventos e atualizam status; pagamentos tardios ficam em revisão e não reativam automaticamente reserva/equipe cancelada. Nenhuma cobrança de teste foi feita.
- [x] **Proteger a API Key** — a aplicação lê o segredo exclusivamente de `INFINITEPAY_API_KEY` no servidor; `.env` está ignorado pelo Git; o modo real exige `INFINITEPAY_ENABLED=true` e chave/tag válidas.
- [x] **Ativar InfinitePay em produção** — migração 0007 aplicada, segredo e InfiniteTag configurados no backend Render, modo público `infinitepay` e deploy ativo; nenhuma cobrança de teste foi feita.

## Atualização: valor por hora e entrada da reserva

- [x] **Calcular preço pela duração selecionada** — cobrar R$ 60,00 por 60 minutos na tarifa normal; quando o total reservado ultrapassar 60 minutos, aplicar R$ 50,00 por hora a todo o período (por exemplo, 4 horas = R$ 200,00); somar durações reais, não a quantidade de blocos; aceitar até 16 horas por pedido, incluindo até 32 blocos de 30 minutos, quando a grade do dia permitir; recalcular total no navegador e no servidor.
- [x] **Escolher entrada ou valor integral antes do checkout** — depois de preencher os dados da reserva e avançar, mostrar uma caixa modal acessível sobre o fundo com blur leve e fade-in; oferecer pagamento inicial de 30% do total ou pagamento integral; arredondar a entrada para centavos e cobrar somente a opção escolhida na InfinitePay; mostrar o saldo restante sem marcar a reserva como totalmente quitada.
- [x] **Registrar recebimento e saldo corretamente** — validar `payment_check` pelo valor efetivamente cobrado, confirmar a reserva após pagamento, manter o total contratado separado do valor recebido e exibir entrada/saldo no retorno e no admin.
- [x] **Reduzir repetição de cadastro no checkout** — pré-preencher nome e WhatsApp já informados na reserva quando suportado; nunca enviar CPF/endereço à InfinitePay; manter a Política de Privacidade precisa quanto aos dados compartilhados.
- [ ] **Desativar cartão no checkout InfinitePay** — requisito solicitado, mas bloqueado pela documentação oficial: o cartão de crédito permanece sempre disponível; decidir entre manter o checkout InfinitePay com cartão disponível ou trocar para um provedor que permita Pix-only antes de marcar como atendido.

## Confirmação automática e promoção interativa

- [x] **Confirmar Pix automaticamente no painel** — processar webhook/retorno somente após `payment_check` server-to-server com valor exato; confirmar a reserva quando ainda houver disponibilidade; listar atualização no Admin em até 30 segundos e manter pagamentos conflitantes em revisão.
- [x] **Exibir corretamente entrada e quitação** — após validar 30%, exibir no Admin “Falta pagar 70% do valor da reserva” com o saldo em reais; após validar 100%, exibir “Pago”; calcular percentuais somente sobre valores confirmados pelo provedor.
- [x] **Tornar a promoção uma bolinha interativa na etapa dos dados** — pulsação lenta com anel, abrir modal de contraste alto com blur/fade e explicação dinâmica do preço; fechar por OK/Escape, restaurar o foco e respeitar preferência por movimento reduzido.

## Correções operacionais desta solicitação

- [x] **Selecionar e reservar mais de um horário** — permitir selecionar vários horários livres para a mesma quadra/dia; enviar todos ao backend, validar e gravar juntos em transação, calcular o total pela quantidade selecionada e listar todos na confirmação; conflitos mantêm a reserva inteira sem gravação parcial.
- [x] **Simplificar a inscrição do torneio** — aceitar capitão + exatamente três atletas; pedir somente primeiro nome, sem atletas adicionais opcionais; manter validação, consentimento, persistência separada e etapa de Pix demonstrativo no valor de R$ 150.
- [x] **Corrigir o salvamento da grade no admin** — persistir a alteração do dia no Neon como operação principal; uma falha na auditoria não desfaz o horário salvo; comunicar sessão expirada/erro; atualizar a grade do painel e invalidar datas e disponibilidade públicas após salvar ou copiar a semana.
- [x] **Tornar a pré-inscrição repetível em caso de falha** — não consumir o limite por telefone antes de a inscrição e a auditoria gravarem com sucesso; não enviar campos de atletas opcionais vazios; manter log técnico limitado a código/constraint, sem dados pessoais.
- [ ] **Confirmar o fluxo comercial no site publicado** — após implantação, a Arena deve salvar um dia/horário real no painel e confirmar que ele aparece na reserva pública; verificar um quarteto com quatro primeiros nomes e uma reserva com múltiplos horários, sem inserir dados fictícios na base comercial.

## Reserva mobile: calendário e navegação por etapas

- [x] **Simplificar o fluxo em celular** — em telas móveis, mostrar uma etapa por vez (unidade/quadra; data e horários juntos; dados do responsável); depois de escolher unidade e quadra, “Escolher dia e horários” leva ao calendário com horários logo abaixo. Escolher uma data carrega os horários no mesmo passo; depois de selecionar horários, avançar para os dados. Permitir voltar sem perder escolhas e exibir progresso e resumo compacto; preservar o formulário completo em telas maiores.
- [ ] **Ampliar a agenda pública** — permitir escolher dias abertos desde hoje até 180 dias à frente, com navegação mensal em calendário compacto; respeitar os horários semanais e exceções/feriados configurados no admin, carregar as datas e horários sem erro do PostgreSQL (`date + unknown`) e manter a validação final no servidor, inclusive em chamadas diretas ao backend.
- [x] **Acelerar a escolha de quadras** — pré-carregar as quadras no carregamento inicial da rota e reutilizar a resposta cacheada na consulta cliente, evitando esperar por uma busca adicional após abrir a reserva.
- [x] **Flutuar e simplificar a promoção** — manter uma bolinha flutuante na área de reserva com somente “Aperte para liberar sua PROMOÇÃO”; ao abrir, exibir uma mensagem curta e comercial com o valor correto, animação responsiva e fechamento por OK/Escape, respeitando movimento reduzido e sem encobrir os controles.
- [x] **Informar a regra de cancelamento antes de concluir** — depois do preenchimento, exibir que cancelamentos só podem ser solicitados até 15 horas antes do primeiro horário da reserva.

## Visibilidade das quadras e fluxo de horários

- [x] **Fazer a ativação do admin refletir na reserva pública** — ao marcar uma quadra como ativa e salvar preço/tempo, atualizar a configuração do admin e a lista pública de espaços; deixar claro se a quadra será exibida ou se ainda falta preço/ativação.
- [x] **Mostrar os horários junto da escolha do dia no celular** — depois de selecionar unidade e quadra, abrir uma etapa que permite escolher o dia e logo abaixo ver/selecionar os horários daquele dia, sem uma etapa intermediária que pareça vazia; manter datas e escolhas anteriores ao avançar/voltar.
- [x] **Exibir a promoção sobre as outras camadas e apenas uma vez** — dar ao botão flutuante prioridade visual no conteúdo da reserva; após abrir e fechar o aviso por OK, X, Escape ou backdrop, dispensar o botão para o usuário; usar texto curto e direto.
- [x] **Publicar as quadras da Unidade 2** — ativar as quatro quadras existentes de 60 minutos a R$60/h, sem alterar a grade semanal; reservas acima de uma hora seguem a promoção já implementada de R$50/h.
