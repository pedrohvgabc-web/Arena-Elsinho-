<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Space imagery is shared through `src/lib/space-images.ts` using uploaded asset pointers so home and booking selections always show the same real photos.
- Business rules (hours, slots, phone, timezone) live in `src/lib/arena-rules.ts` as pure functions; server re-validates every booking with them — UI is display only.
- All DB access goes through server functions in `src/lib/arena.functions.ts` using the service-role client loaded inside handlers; tables have RLS on with no anon policies (except `arena_spaces` read) so customer data never leaks.
- Booking conflicts are prevented by a Postgres exclusion constraint on (space_id, slot) for pending/paid rows; idempotency via unique `idempotency_key`.
- Admin auth is a single password (`ADMIN_PASSWORD` secret) → random token, SHA-256 hash stored in `admin_sessions`, HttpOnly Secure cookie; rate limits are stored in `rate_limits` (workers are stateless).
- Payments go through the provider abstraction in `src/lib/payments.server.ts` (Mercado Pago when `MERCADOPAGO_ACCESS_TOKEN` is set, else demo that never marks paid). Pix auto-confirms only via webhook `/api/public/payments/webhook`, which re-fetches the payment from the provider API; admins may also confirm any pending booking manually.
