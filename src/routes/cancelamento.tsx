import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalMeta } from "@/components/LegalPage";

export const Route = createFileRoute("/cancelamento")({
  head: () => legalMeta("Política de Cancelamento", "Como cancelar ou remarcar uma reserva na Arena Elsinho."),
  component: () => (
    <LegalPage title="Política de Cancelamento">
      <h2>Como cancelar</h2>
      <p>Para cancelar ou remarcar, fale com a arena pelo WhatsApp informando o código da sua reserva.</p>
      <h2>Pix online</h2>
      <p>Reservas com Pix ficam pendentes até a confirmação do pagamento e podem expirar se não forem pagas dentro do prazo indicado.</p>
      <h2>Condições</h2>
      <p>Prazos e eventuais reembolsos são combinados diretamente com a administração da arena.</p>
    </LegalPage>
  ),
});
