# QA
- Testes unitários (`src/lib/arena-rules.test.ts`): domingo, data passada, fora do horário, intervalo de almoço, último horário 23:59, horário passado no dia, telefone — 11/11 passando.
- E2E manual automatizado: reserva completa até a confirmação; registro conferido no banco e removido.
- Conflitos/duplicidade garantidos pelo banco (constraint de exclusão e chave de idempotência).
- Pendente: testes automatizados de login/admin e de acessibilidade com ferramenta dedicada.
