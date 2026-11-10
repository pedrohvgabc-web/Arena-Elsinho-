export function cleanTournamentRoster(names: readonly string[]) {
  return names.map((name) => name.trim()).filter((name) => name.length > 0);
}
