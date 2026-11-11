# InfinitePay Checkout — notas de integração

## Contrato oficial consultado

- Criar um checkout: `POST https://api.checkout.infinitepay.io/links`.
- O valor de `items[].price` é informado em centavos.
- A API Key fica somente no servidor, no header `X-Api-Key`. Com chave, a InfiniteTag não precisa acompanhar a criação do link; a consulta de status usa `handle`, que precisa pertencer à mesma conta da chave.
- Pix e cartão: a opção por link fica em `options.payment_methods_enabled: ["credit_card", "pix"]`; a InfinitePay informa que cartão está sempre disponível.
- Cobrança única: `options.single_payment: true`. Validade: `options.valid_until` em ISO 8601, no futuro e até um ano.
- Retorno: `redirect_url` recebe `order_nsu`, `slug`, `capture_method`, `transaction_nsu` e `receipt_url`. A documentação informa que o comprador toca em “Continuar” no checkout/comprovante para voltar ao site.
- Webhook: a forma oficial documentada é `webhook: { url, events }`. O webhook não tem assinatura; verificar cada aviso no servidor com `POST https://api.checkout.infinitepay.io/payment_check` e a API Key. O webhook deve ser tratado como aviso, não como prova de pagamento.
- A resposta de `payment_check` inclui `success`, `paid`, `amount`, `paid_amount`, `installments` e `capture_method`. Não se deve exigir que `amount` e `paid_amount` sejam iguais, pois o segundo pode incluir taxas repassadas.
- A API não oferece sandbox: o botão de teste cria um link real; a central de ajuda informa valor mínimo de R$ 1,00. Portanto, o código não deve fazer compras de teste automaticamente.
- A central de ajuda alerta que não há consulta de link pelo `order_nsu`; reenvio da mesma requisição pode retornar o mesmo link. A URL recebida deve ser persistida imediatamente e não deve ser gravada em logs públicos.

## Aplicação neste projeto

O backend cria um link por reserva agrupada e um por pré-inscrição do torneio, com NSUs prefixados diferentes. O preço vem do banco e das regras do servidor: R$ 60/hora no preço-base atual e R$ 50/hora na promoção para duas ou mais horas elegíveis. O site só redireciona para o checkout hospedado; não exibe nem inventa um payload Pix bancário.

O checkout real permanece desligado por padrão. Ele só poderá ser ativado no serviço backend do Render quando a nova chave e a InfiniteTag correta estiverem configuradas como variáveis de ambiente. A chave anterior foi compartilhada em conversa e não deve ser reutilizada. Nenhuma chave deve entrar no repositório, no bundle do navegador, em `render.yaml` ou em arquivo `.env` versionado.

## Fontes oficiais

1. InfinitePay — [Documentação do Checkout Integrado](https://www.infinitepay.io/checkout-documentacao), consultada em 2026-11-11.
2. InfinitePay — [Como usar o Checkout Integrado](https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-integrado), consultada em 2026-11-11.

## Implementação no repositório

- Configuração: `INFINITEPAY_ENABLED` (precisa ser `true` para iniciar o modo real), `INFINITEPAY_API_KEY` (somente secret do servidor) e `INFINITEPAY_HANDLE` (para esta conta: `pedro-henrique-veira`, sem `$`). A aplicação retorna `demo` se a integração estiver desligada e `unavailable` se estiver ligada com configuração incompleta.
- Callback do webhook: `https://arena-leste.onrender.com/api/public/payments/webhook`. Callback de retorno: `https://arena-leste.onrender.com/pagamento/retorno`. Recomenda-se habilitar o redirecionamento após o pagamento para mostrar o resultado ao cliente; a confirmação, porém, depende sempre do webhook ou da consulta `payment_check`, não do redirect.
- Migração: `drizzle/migrations/0007_infinitepay_checkout.sql`. Reservas com pagamento online seguram a disponibilidade por 30 minutos; links do torneio expiram em 24 horas. Um pagamento de reserva múltipla é uma única cobrança calculada integralmente no servidor.
- Checkout: o payload oferece Pix e cartão em pagamento único e desativa endereço de entrega (`require_delivery_address: false`). CPF/endereço locais não são incluídos no pedido enviado à InfinitePay.
- Webhook repetido: o identificador `order_nsu + transaction_nsu` é usado para idempotência. Dados pessoais, API Key e corpo integral do webhook não são gravados nos logs de auditoria.
- Revisão tardia: se o pagamento entrar depois da expiração/cancelamento, ele é registrado como recebido, mas a reserva/equipe não é confirmada automaticamente. O admin pode reativar uma reserva apenas se o horário ainda não terminou, não houver conflito e o pagamento continuar sem estorno; equipe cancelada permanece cancelada. Em caso de conflito/cancelamento, contato e eventual estorno são manuais no painel InfinitePay.
- Antes de ativar: aplicar a migração ao banco, publicar o código com a integração ainda desligada, cadastrar os três valores na seção **Environment** do serviço Web Service da Render e conferir a URL do webhook e que **Redirecionar após pagamento** está ligado no painel InfinitePay. Só então definir `INFINITEPAY_ENABLED=true` e salvar/deployar.
- Não há sandbox de cobrança. Não clicar em checkout real para testar sem aprovação expressa e sem combinar previamente a cobrança com o titular da conta InfinitePay.
