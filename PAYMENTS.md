# Pagamentos

O novo agendamento da Arena Leste abre o WhatsApp da unidade escolhida; não recolhe dados de cartão ou Pix. O Torneio Novembro Azul exibe taxa de R$150 por equipe, mas o formulário registra apenas uma pré-inscrição e não efetua cobrança. A organização confirma a vaga e orienta a forma de pagamento diretamente com o capitão.

O módulo antigo permanece travado no provedor demonstrativo: `provider=demo`, `is_simulated=true`, payload identificável como demonstração e nenhuma confirmação automática. `getProvider()` ignora qualquer token PSP residual; não há chamada a Mercado Pago nem segredo PSP no `.env.example`. Uma integração real exigiria nova implementação e autorização explícita. A antiga agenda está arquivada no admin e seus registros não representam disponibilidade das unidades Arena Leste.
