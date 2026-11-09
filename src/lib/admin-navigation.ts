import {
  Archive,
  CalendarDays,
  ContactRound,
  Database,
  LayoutDashboard,
  Settings2,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type AdminModuleId =
  "overview" | "agenda" | "courts" | "tournament" | "contact" | "backup" | "legacy";

export const ADMIN_MODULES: Array<{
  id: AdminModuleId;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "agenda", label: "Agenda e reservas", icon: CalendarDays },
  { id: "courts", label: "Quadras e horários", icon: Settings2 },
  { id: "tournament", label: "Torneio", icon: Trophy },
  { id: "contact", label: "Contato", icon: ContactRound },
  { id: "backup", label: "Backup", icon: Database },
  { id: "legacy", label: "Histórico legado", icon: Archive },
];
