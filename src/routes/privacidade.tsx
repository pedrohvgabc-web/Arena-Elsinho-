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
        Esta política explica como a Arena Leste usa os dados enviados pelo site, pelo pedido de
        reserva e pelo formulário de pré-inscrição do Torneio Novembro Azul.
      </p>
      <h2>Dados coletados</h2>
      <p>
        No pedido de reserva, coletamos nome, WhatsApp, CPF e endereço completo do responsável, além
        da unidade, quadra, data, horários, forma de pagamento e observações opcionais. O CPF é
        validado no envio e armazenado em formato numérico junto ao registro da reserva.
      </p>
      <p>
        Na pré-inscrição do torneio, coletamos o nome do capitão, o WhatsApp para contato, o nome
        opcional da equipe e os nomes dos demais atletas. O formulário de direitos LGPD também pede
        nome, telefone e o tipo de solicitação. Para limitar inscrições repetidas, uma chave
        temporária usa um hash derivado do WhatsApp do capitão; o número não é gravado nessa chave.
      </p>
      <h2>Finalidade</h2>
      <p>
        Usamos os dados da reserva para identificar o responsável, registrar e administrar os
        horários e falar com ele sobre a reserva. O CPF e o endereço não aparecem na confirmação
        pública nem na mensagem automática que pode ser aberta no WhatsApp. Usamos os dados da
        equipe para organizar as inscrições do torneio, verificar a lista de atletas e falar com o
        capitão sobre a participação. Mensagens digitadas diretamente no WhatsApp são tratadas por
        esse serviço.
      </p>
      <h2>Armazenamento e compartilhamento</h2>
      <p>
        Reservas e pré-inscrições são armazenadas no banco Neon e acessíveis ao servidor da
        aplicação e à administração autenticada. Não vendemos dados. Usamos a infraestrutura do
        Render para hospedar o site e o servidor e a do Neon para manter o banco de dados.
      </p>
      <p>
        Quando o checkout real estiver ativado, o site abre uma página hospedada pela InfinitePay
        para pagamento por Pix ou cartão. Para gerar o link, compartilhamos com esse provedor o
        valor, uma descrição do serviço e um código técnico do pedido; não enviamos CPF nem
        endereço. Os dados do cartão são informados diretamente no ambiente da InfinitePay. O
        servidor recebe identificadores da transação e consulta a InfinitePay para validar o
        pagamento.
      </p>
      <p>
        Os dados de reserva são mantidos pelo tempo necessário para administrar os agendamentos e
        cumprir obrigações aplicáveis. Os dados de inscrição serão mantidos pelo período necessário
        à organização do torneio e, em regra, por até 12 meses após o evento, salvo necessidade de
        retenção por obrigação legal. Solicitações de exclusão e demais direitos serão avaliadas
        conforme a lei aplicável.
      </p>
      <h2>Segurança</h2>
      <p>
        Os formulários validam os dados no servidor e têm limite de tentativas. As reservas e
        inscrições não são públicas e o painel exige autenticação. O CPF e o endereço não são
        incluídos na confirmação pública, nas mensagens automáticas de WhatsApp ou no link de
        pagamento da InfinitePay. A chave de API de pagamento é mantida somente em configuração
        privada do servidor.
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
