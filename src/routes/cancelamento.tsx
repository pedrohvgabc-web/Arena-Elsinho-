import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalMeta } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/cancelamento")({
  head: () =>
    legalMeta(
      "Política de Cancelamento",
      `Como tratar pedidos de agendamento e inscrição com a ${SITE.name}.`,
    ),
  component: () => (
    <LegalPage title="Cancelamento e alterações">
      <h2>Agendamentos</h2>
      <p>
        Para alterar ou cancelar um horário, fale com a equipe pelo WhatsApp {SITE.phoneDisplay} e
        informe o código da reserva, a unidade, o dia e o horário. O site não cancela uma cobrança
        nem solicita estorno automaticamente.
      </p>
      <h2>Pré-inscrição no torneio</h2>
      <p>
        Para corrigir ou retirar uma pré-inscrição, o capitão deve entrar em contato com a Arena
        pelo WhatsApp {SITE.phoneDisplay}, informando o código recebido e o nome da equipe. Se houve
        pagamento via InfinitePay, o cancelamento da inscrição não estorna a cobrança; a solicitação
        de análise de estorno deve ser tratada com a organização.
      </p>
      <h2>Condições</h2>
      <p>
        Confirmações, prazos, alterações e eventuais condições de devolução são tratadas diretamente
        pela organização, observada a legislação aplicável. O site não executa estornos por conta
        própria.
      </p>
    </LegalPage>
  ),
});
