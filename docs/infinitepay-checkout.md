# InfinitePay Checkout — Arena Leste

## Contrato do provedor

A API usa `POST https://api.checkout.infinitepay.io/links` com a chave somente no header `X-Api-Key`; valores de itens são enviados em centavos. A resposta fornece `checkout_url`. A criação inclui `redirect_url` e `webhook: { url, events: ["paid"] }`. Webhooks são avisos, não prova de pagamento: o servidor consulta `POST https://api.checkout.infinitepay.io/payment_check` e confere `success`, `paid`, o pedido, o identificador da transação, a forma reconhecida e o valor exato.

A InfinitePay não oferece sandbox de cobrança. O botão de teste cria um checkout real; não executar pagamento de teste sem autorização expressa do titular da conta. Os links são persistidos no servidor e não devem ser gravados em logs públicos.

### Cartão e Pix

A integração pede `options.payment_methods_enabled: ["pix"]` para habilitar Pix. A documentação oficial informa que o cartão de crédito permanece sempre disponível e que essa opção não consegue desligá-lo. Portanto, este checkout InfinitePay **não pode ser anunciado nem tratado como Pix-only**. Para impedir cartão de fato, é preciso trocar para um provedor que ofereça essa configuração ou aceitar que o cartão apareça.

### Dados no checkout

Para reduzir digitação na reserva, a aplicação pode enviar `customer.name` e `customer.phone_number` com nome e WhatsApp já informados. Não envia CPF, endereço, observações ou dados de cartão. A InfinitePay ainda pode exigir confirmação de contato/código; o checkout hospedado não permite remover essa etapa por esta API. A opção de endereço de entrega fica desativada (`require_delivery_address: false`).

## Regras da Arena

- O servidor calcula o total pela duração real: tarifa normal de R$ 60 por hora; quando a duração total ultrapassa 60 minutos, R$ 50 por hora para todo o período. Dois blocos de 30 minutos somam uma hora e não recebem a promoção. Exemplo: quatro horas = R$ 200.
- A reserva permite até 16 horas por pedido; o número de blocos varia com a duração configurada na quadra (até 32 blocos de 30 minutos), sempre limitado à disponibilidade efetiva.
- Antes do checkout, o responsável escolhe cobrar 30% do total ou 100%. O valor é arredondado em centavos e calculado no servidor. Após a validação server-to-server por `payment_check` (webhook ou retorno), a reserva é confirmada automaticamente se os horários continuam disponíveis e aparece no painel Admin na atualização periódica. Com a entrada validada, o painel informa “Falta pagar 70% do valor da reserva” e o saldo em reais; no pagamento integral, mostra “Pago”. O saldo não é incluído no primeiro checkout.
- Uma cobrança InfinitePay cobre o grupo de horários. O valor esperado por `payment_check` é a soma das parcelas técnicas gravadas em `payments`, não somente a primeira linha que contém o `provider_ref`.
- Reservas online ficam pendentes por 30 minutos. Após confirmação server-to-server, a reserva é mantida como ocupada; pagamentos tardios/conflitantes exigem revisão administrativa. Cancelar não processa estorno.

## Configuração e rotas

- Variáveis exclusivamente no serviço Web Service da Render: `INFINITEPAY_ENABLED=true`, `INFINITEPAY_API_KEY` (secret) e `INFINITEPAY_HANDLE=pedro-henrique-veira` (sem `$`). Não enviar a chave por chat nem incluí-la em `.env` versionado, `render.yaml`, logs ou bundle público.
- Webhook: `https://arena-leste.onrender.com/api/public/payments/webhook`.
- Retorno: `https://arena-leste.onrender.com/pagamento/retorno`.
- O redirect apenas mostra o estado consultado pelo servidor; não confirma uma cobrança por si só. O webhook também executa `payment_check` e é idempotente.
- O schema da integração inicial está em `drizzle/migrations/0007_infinitepay_checkout.sql`. O rateio da entrada usa os campos monetários existentes e não exige nova coluna para distinguir total contratado de valor cobrado.

## Fontes oficiais consultadas

1. InfinitePay — [Documentação do Checkout Integrado](https://www.infinitepay.io/checkout-documentacao), consultada em 2026-11-11: configuração de meios disponíveis, prefill de comprador, `payment_check`, retorno e webhooks.
2. InfinitePay — [Como usar o Checkout Integrado](https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-integrado), consultada em 2026-11-11: operação do checkout e ausência de sandbox para cobrança real.
