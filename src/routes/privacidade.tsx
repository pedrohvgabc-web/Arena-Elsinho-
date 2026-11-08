import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LegalPage, legalMeta } from "@/components/LegalPage";
import { submitPrivacyRequest } from "@/lib/arena.functions";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/privacidade")({
  head: () =>
    legalMeta(
      "Política de Privacidade",
      `Como a ${SITE.name} trata dados pessoais de acordo com a LGPD.`,
    ),
  component: Page,
});

function Page() {
  const send = useServerFn(submitPrivacyRequest);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        Esta política explica como a Arena Leste usa os dados enviados pelo site e pelo formulário
        de pré-inscrição do Torneio Novembro Azul.
      </p>
      <h2>Dados coletados</h2>
      <p>
        Na pré-inscrição, coletamos o nome do capitão, o WhatsApp para contato, o nome opcional da
        equipe e os nomes dos demais atletas. A solicitação enviada ao formulário de direitos LGPD
        também pede nome, telefone e o tipo de solicitação. Para limitar inscrições repetidas, uma
        chave temporária usa um hash derivado do WhatsApp do capitão; o número não é gravado nessa
        chave.
      </p>
      <h2>Finalidade</h2>
      <p>
        Usamos os dados da equipe para organizar as inscrições do torneio, verificar a lista de
        atletas e falar com o capitão sobre a participação. O botão de agendamento abre uma conversa
        no WhatsApp oficial; os dados digitados nessa conversa são tratados pelo WhatsApp e não são
        armazenados por este formulário do site.
      </p>
      <h2>Armazenamento e compartilhamento</h2>
      <p>
        As pré-inscrições são armazenadas no banco Neon, acessível somente ao servidor da aplicação
        e à administração autenticada. Não vendemos dados. Usamos infraestrutura técnica de
        hospedagem para operar o site e o banco.
      </p>
      <p>
        Os dados de inscrição serão mantidos pelo período necessário à organização do torneio e, em
        regra, por até 12 meses após o evento, salvo necessidade de retenção por obrigação legal.
        Solicitações de exclusão e demais direitos serão avaliadas conforme a lei aplicável.
      </p>
      <h2>Segurança</h2>
      <p>
        O formulário valida os dados no servidor e tem limite de tentativas. A lista de inscrições
        não é pública e o painel exige autenticação. Não envie informações sensíveis além do nome e
        WhatsApp solicitados.
      </p>
      <h2>Seus direitos</h2>
      <p>
        Você pode solicitar confirmação de tratamento, acesso, correção ou exclusão dos dados, além
        de exercer outros direitos previstos na LGPD.
      </p>
      <h2>Solicitar acesso, correção ou exclusão</h2>
      <form
        className="mt-4 grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const result = await send({
            data: {
              name: String(form.get("name")),
              phone: String(form.get("phone")),
              type: form.get("type") as "access" | "correction" | "deletion",
              message: String(form.get("message") || ""),
            },
          }).catch(() => ({ ok: false, error: "Falha de conexão." }));
          setMsg(
            result.ok
              ? "Solicitação registrada para análise. A equipe entrará em contato se precisar de informações adicionais."
              : result.error,
          );
          if (result.ok) event.currentTarget.reset();
        }}
      >
        <label className="text-sm">
          Nome
          <input
            name="name"
            required
            minLength={3}
            maxLength={80}
            autoComplete="name"
            className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3"
          />
        </label>
        <label className="text-sm">
          WhatsApp
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            required
            maxLength={30}
            className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3"
          />
        </label>
        <label className="text-sm">
          Tipo
          <select
            name="type"
            className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3"
          >
            <option value="access">Acesso aos dados</option>
            <option value="correction">Correção</option>
            <option value="deletion">Exclusão</option>
          </select>
        </label>
        <label className="text-sm">
          Mensagem (opcional)
          <textarea
            name="message"
            maxLength={1000}
            className="mt-1 w-full rounded-lg border border-input bg-card p-3"
          />
        </label>
        <button className="min-h-11 w-fit rounded-full bg-primary px-6 font-bold text-primary-foreground">
          Enviar solicitação
        </button>
        {msg && <p role="status">{msg}</p>}
      </form>
    </LegalPage>
  );
}
