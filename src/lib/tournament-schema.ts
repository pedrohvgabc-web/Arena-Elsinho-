import { z } from "zod";

const personName = z
  .string()
  .trim()
  .min(3, "Informe o primeiro nome, com pelo menos três letras.")
  .max(80, "O nome deve ter até 80 caracteres.")
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u, "Use apenas um nome válido.");

export const tournamentRegistrationSchema = z
  .object({
    captainName: personName,
    phone: z.string().trim().min(10).max(30),
    teamName: z.string().trim().max(80).optional().default(""),
    athletes: z
      .array(personName)
      .length(3, "Informe o primeiro nome dos outros três integrantes da equipe."),
    consent: z.boolean().refine((value) => value, {
      message: "É necessário aceitar o uso dos dados para organizar o torneio.",
    }),
    website: z.string().max(120).optional().default(""),
    submissionId: z.string().uuid(),
  })
  .strict()
  .superRefine((team, ctx) => {
    const names = [team.captainName, ...team.athletes].map((name) =>
      name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase("pt-BR"),
    );
    if (new Set(names).size !== names.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["athletes"],
        message: "Cada atleta deve ter um nome diferente.",
      });
    }
    if (/[<>]/.test(team.teamName ?? "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["teamName"],
        message: "Nome da equipe inválido.",
      });
    }
  });

export type TournamentRegistrationInput = z.infer<typeof tournamentRegistrationSchema>;
export type TournamentRegistrationStatus = "pending" | "confirmed" | "cancelled";
