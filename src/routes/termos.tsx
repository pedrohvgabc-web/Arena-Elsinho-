import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalMeta } from "@/components/LegalPage";

export const Route = createFileRoute("/termos")({
  head: () => legalMeta("Termos de Uso", "Regras de uso do site e dos espaços da Arena Elsinho."),
  component: () => (
    <LegalPage title="Termos de Uso">
      <h2>Reservas</h2>
      <p>A reserva é registrada ao concluir o formulário e fica pendente até a confirmação do pagamento. Cada horário tem duração padrão de 60 minutos.</p>
      <h2>Uso dos espaços</h2>
      <ul><li>Respeite a capacidade máxima de cada espaço.</li><li>Use calçado adequado ao piso.</li><li>Zele pela estrutura e pelo convívio com outros grupos.</li></ul>
      <h2>Responsabilidades</h2>
      <p>O responsável pela reserva responde pelo grupo durante o horário reservado.</p>
      <h2>Alterações</h2>
      <p>Estes termos podem ser atualizados. A versão vigente estará sempre nesta página.</p>
    </LegalPage>
  ),
});
