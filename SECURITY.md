# Segurança
- Validação com zod em todas as server functions; nome sanitizado; queries parametrizadas (sem SQL manual).
- RLS ativo em todas as tabelas; clientes anônimos só leem `arena_spaces`.
- Admin: senha em secret, comparação por hash em tempo constante, token aleatório (hash no banco), cookie HttpOnly/Secure/SameSite=None (necessário no Preview em iframe), expiração 8h, logout apaga sessão.
- Rate limit: login 5/15min, reservas 10/10min, LGPD 5/h por IP.
- CSRF: middleware do TanStack Start para server functions.
- Auditoria em `audit_logs` (sem senhas). Erros retornam mensagens genéricas.
- Pendente: CSP e headers de segurança no domínio publicado; webhook assinado quando houver PSP.
