import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LegalPage, legalMeta } from "@/components/LegalPage";
import { submitPrivacyRequest } from "@/lib/arena.functions";

export const Route = createFileRoute("/privacidade")({
  head: () => legalMeta("Política de Privacidade", "Como a Arena Elsinho trata seus dados pessoais conforme a LGPD."),
  component: Page,
});

function Page() {
  const send = useServerFn(submitPrivacyRequest);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <LegalPage title="Política de Privacidade">
      <h2>Dados coletados</h2>
      <p>Apenas nome completo, número de WhatsApp, espaço, data, horário e forma de pagamento escolhidos na reserva.</p>
      <h2>Finalidade</h2>
      <p>Organizar a agenda, confirmar reservas, controlar pagamentos e entrar em contato sobre o seu horário.</p>
      <h2>Tempo de armazenamento</h2>
      <p>Os dados ficam guardados por até 12 meses após a data da reserva, ou pelo prazo exigido por obrigações legais e fiscais.</p>
      <h2>Compartilhamento</h2>
      <p>Não vendemos seus dados. Podem ser compartilhados apenas com o provedor de pagamento, quando você escolhe Pix online, e com a infraestrutura técnica que hospeda o sistema.</p>
      <h2>Seus direitos</h2>
      <ul><li>Confirmar e acessar seus dados</li><li>Corrigir dados incompletos ou desatualizados</li><li>Solicitar a exclusão</li><li>Revogar consentimento</li></ul>
      <h2>Solicitar acesso ou exclusão</h2>
      <form className="mt-4 grid gap-3" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const r = await send({ data: { name: String(f.get("name")), phone: String(f.get("phone")), type: f.get("type") as "access", message: String(f.get("message") || "") } }).catch(() => ({ ok: false, error: "Falha de conexão." }));
        setMsg(r.ok ? "Solicitação registrada. Entraremos em contato pelo WhatsApp." : r.error);
        if (r.ok) e.currentTarget.reset();
      }}>
        <label className="text-sm">Nome<input name="name" required minLength={3} className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3" /></label>
        <label className="text-sm">WhatsApp<input name="phone" type="tel" required className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3" /></label>
        <label className="text-sm">Tipo
          <select name="type" className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3"><option value="access">Acesso aos dados</option><option value="correction">Correção</option><option value="deletion">Exclusão</option></select>
        </label>
        <label className="text-sm">Mensagem (opcional)<textarea name="message" maxLength={1000} className="mt-1 w-full rounded-lg border border-input bg-card p-3" /></label>
        <button className="min-h-11 w-fit rounded-full bg-primary px-6 font-bold text-primary-foreground">Enviar solicitação</button>
        {msg && <p role="status">{msg}</p>}
      </form>
    </LegalPage>
  );
}
