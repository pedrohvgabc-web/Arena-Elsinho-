import { describe, expect, it } from "vitest";
import { tournamentRegistrationSchema } from "./tournament-schema";
import { cleanTournamentRoster } from "./tournament-roster";

const registration = (overrides: Record<string, unknown> = {}) => ({
  captainName: "João Silva",
  phone: "(69) 99356-6796",
  teamName: "Areia Forte 69",
  athletes: ["Pedro Souza", "Rafael Lima", "Bruno Santos"],
  consent: true,
  website: "",
  submissionId: "d61a0c95-d3d8-4b0c-9e85-6ea7bd4fb646",
  ...overrides,
});

describe("tournamentRegistrationSchema", () => {
  it("accepts a quarteto (capitão + três atletas)", () => {
    expect(tournamentRegistrationSchema.safeParse(registration()).success).toBe(true);
  });

  it("ignores blank optional roster fields without dropping required players", () => {
    const athletes = cleanTournamentRoster(["Pedro Souza", "Rafael Lima", "Bruno Santos", ""]);
    expect(tournamentRegistrationSchema.safeParse(registration({ athletes })).success).toBe(true);
  });

  it("accepts up to six people including the captain", () => {
    const athletes = ["Pedro Souza", "Rafael Lima", "Bruno Santos", "Caio Alves", "Lucas Nunes"];
    expect(tournamentRegistrationSchema.safeParse(registration({ athletes })).success).toBe(true);
  });

  it("rejects a team with fewer than four people total", () => {
    expect(
      tournamentRegistrationSchema.safeParse(
        registration({ athletes: ["Pedro Souza", "Rafael Lima"] }),
      ).success,
    ).toBe(false);
  });

  it("rejects a team larger than six people total", () => {
    const athletes = [
      "Pedro Souza",
      "Rafael Lima",
      "Bruno Santos",
      "Caio Alves",
      "Lucas Nunes",
      "Mateus Costa",
    ];
    expect(tournamentRegistrationSchema.safeParse(registration({ athletes })).success).toBe(false);
  });

  it("rejects duplicate names, including accent-insensitive duplicates", () => {
    expect(
      tournamentRegistrationSchema.safeParse(
        registration({ athletes: ["Pedro Souza", "Rafael Lima", "Joao Silva"] }),
      ).success,
    ).toBe(false);
  });

  it("requires explicit privacy consent", () => {
    expect(tournamentRegistrationSchema.safeParse(registration({ consent: false })).success).toBe(
      false,
    );
  });

  it("rejects markup in athlete names", () => {
    expect(
      tournamentRegistrationSchema.safeParse(
        registration({ athletes: ["<script>", "Rafael Lima", "Bruno Santos"] }),
      ).success,
    ).toBe(false);
  });
});
