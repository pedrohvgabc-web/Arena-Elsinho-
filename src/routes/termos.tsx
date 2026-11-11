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
        O site registra pedidos de reserva por unidade, quadra, data e horário. Quando o checkout
        InfinitePay estiver ativado, a reserva fica pendente enquanto a cobrança é processada e só é
        confirmada após validação servidor a servidor. A página de retorno do checkout, por si só,
        não comprova o pagamento. Antes do checkout online, o responsável pode optar por pagar uma
        entrada de 30% ou o valor integral. Após a validação da cobrança, a reserva só é confirmada
        se os horários ainda estiverem disponíveis; em caso de conflito ou expiração, o pagamento
        recebido exige revisão da equipe. A entrada não quita o total: o saldo restante continua
        pendente e deve ser pago conforme orientação da Arena. Pagamento no local fica sujeito à
        confirmação da equipe.
      </p>
      <h2>Pré-inscrição no torneio</h2>
      <p>
        O formulário do {TOURNAMENT.name} registra os dados da equipe para análise pela organização.
        A categoria é {TOURNAMENT.category}, e o evento está divulgado para {TOURNAMENT.date} às{" "}
        {TOURNAMENT.time}. A inscrição informada é {TOURNAMENT.entryFee}.
      </p>
      <p>
        O formulário registra uma equipe com quatro participantes. Quando o checkout InfinitePay
        estiver ativado, a taxa poderá ser paga por Pix ou cartão no ambiente hospedado pela
        InfinitePay. A inscrição só aparece como paga depois da validação do servidor. Se o site
        estiver no modo demonstrativo, o código exibido não movimenta dinheiro nem comprova
        pagamento.
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
