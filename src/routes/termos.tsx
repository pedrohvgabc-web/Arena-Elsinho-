import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalMeta } from "@/components/LegalPage";
import { SITE, TOURNAMENT } from "@/lib/site";

export const Route = createFileRoute("/termos")({
  head: () =>
    legalMeta(
      "Termos de Uso",
      `Regras de uso do site da ${SITE.name} e informações de agendamento e pré-inscrição.`,
    ),
  component: () => (
    <LegalPage title="Termos de Uso">
      <h2>Agendamento das unidades</h2>
      <p>
        Os botões de agendamento iniciam uma conversa pelo WhatsApp da Arena Leste e identificam a
        unidade escolhida. O envio da mensagem é um pedido de consulta, não uma confirmação
        automática. Horários, valores e condições são confirmados diretamente pela equipe.
      </p>
      <h2>Pré-inscrição no torneio</h2>
      <p>
        O formulário do {TOURNAMENT.name} registra os dados da equipe para análise pela organização.
        A categoria é {TOURNAMENT.category}, e o evento está divulgado para {TOURNAMENT.date} às{" "}
        {TOURNAMENT.time}. A inscrição informada é {TOURNAMENT.entryFee}.
      </p>
      <p>
        O envio do formulário é uma pré-inscrição, não reserva uma vaga automaticamente e não efetua
        pagamento. A equipe da Arena Leste entrará em contato com o capitão para confirmar a
        participação e orientar sobre os próximos passos.
      </p>
      <h2>Informações de endereço</h2>
      <p>
        Os endereços são reproduzidos com base nos canais públicos e nas informações fornecidas pela
        Arena. Publicações divergem sobre o número da Unidade 2 na Avenida Pinheiro Machado;
        confirme o ponto com a Arena antes de se deslocar.
      </p>
      <h2>Alterações</h2>
      <p>Estes termos podem ser atualizados. A versão vigente estará sempre nesta página.</p>
    </LegalPage>
  ),
});
