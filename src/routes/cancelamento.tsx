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
        Os pedidos de agendamento são feitos pelo WhatsApp e ficam sujeitos à confirmação direta da
        equipe da Arena Leste. Para alterar ou cancelar um horário já confirmado, fale com a equipe
        pelo mesmo canal e informe a unidade, o dia e o horário combinados.
      </p>
      <h2>Pré-inscrição no torneio</h2>
      <p>
        Para corrigir ou retirar uma pré-inscrição, o capitão deve entrar em contato com a Arena
        pelo WhatsApp {SITE.phoneDisplay}, informando o código recebido e o nome da equipe. O
        formulário do site não cobra a taxa e não processa reembolsos.
      </p>
      <h2>Condições</h2>
      <p>
        Confirmações, prazos, alterações e eventuais condições de devolução são tratadas diretamente
        pela organização. O site não promete vaga antes do retorno da Arena.
      </p>
    </LegalPage>
  ),
});
