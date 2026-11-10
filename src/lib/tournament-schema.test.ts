import { describe, expect, it } from "vitest";
import { tournamentRegistrationSchema } from "./tournament-schema";
const registration = (overrides: Record<string, unknown> = {}) => ({
  captainName: "João",
  phone: "(69) 99356-6796",
  teamName: "Areia Forte 69",
  athletes: ["Pedro", "Rafael", "Bruno"],
  consent: true,
  website: "",
  submissionId: "d61a0c95-d3d8-4b0c-9e85-6ea7bd4fb646",
  ...overrides,
});

describe("tournamentRegistrationSchema", () => {
  it("accepts exactly four people using first names only", () => {
    expect(tournamentRegistrationSchema.safeParse(registration()).success).toBe(true);
  });

  it("rejects fewer than four people total", () => {
    expect(
      tournamentRegistrationSchema.safeParse(registration({ athletes: ["Pedro", "Rafael"] }))
        .success,
    ).toBe(false);
  });

  it("rejects a fifth person instead of silently accepting a larger team", () => {
    const athletes = ["Pedro", "Rafael", "Bruno", "Caio"];
    expect(tournamentRegistrationSchema.safeParse(registration({ athletes })).success).toBe(false);
  });

  it("rejects duplicate names, including accent-insensitive duplicates", () => {
    expect(
      tournamentRegistrationSchema.safeParse(registration({ athletes: ["João", "Rafael", "Joao"] }))
        .success,
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
        registration({ athletes: ["<script>", "Rafael", "Bruno"] }),
      ).success,
    ).toBe(false);
  });
});
