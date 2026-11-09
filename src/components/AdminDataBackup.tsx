import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Database, Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { adminExportOperationalData } from "@/lib/arena.functions";

export function AdminDataBackup() {
  const exportData = useServerFn(adminExportOperationalData);
  const [busy, setBusy] = useState(false);

  async function downloadBackup() {
    const confirmed = window.confirm(
      "O JSON contém nomes, WhatsApps e dados de reservas/inscrições. Salve-o apenas em um local seguro e acessível à equipe autorizada. Deseja continuar?",
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const result = await exportData({ data: { confirmed: true } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const file = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `arena-leste-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Backup JSON baixado.");
    } catch {
      toast.error("Não foi possível gerar o backup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="backup-heading" className="max-w-3xl">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary">
        Dados operacionais
      </p>
      <h2
        id="backup-heading"
        className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] sm:text-5xl"
      >
        Backup seguro
      </h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
        Baixe um arquivo JSON com quadras, horários, reservas e pré-inscrições do torneio. O arquivo
        não inclui senhas, sessões de administração, tokens ou payloads de pagamento.
      </p>
      <div className="mt-6 flex items-start gap-3 border-l-2 border-warning pl-4 text-sm leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p>
          O backup contém dados pessoais. Guarde-o em local restrito e evite compartilhá-lo fora da
          organização.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void downloadBackup()}
        disabled={busy}
        className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {busy ? "Preparando arquivo…" : "Exportar backup JSON"}
      </button>
      <p className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Database className="h-3.5 w-3.5" /> A exportação é registrada no log administrativo.
        Importação e exclusão total não ficam disponíveis.
      </p>
    </section>
  );
}
