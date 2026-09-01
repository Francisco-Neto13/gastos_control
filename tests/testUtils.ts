import type { Room, Team } from "@/lib/types";

// Fábricas com valores padrão sensatos para manter os testes curtos e legíveis —
// cada teste só precisa sobrescrever os campos relevantes para o cenário testado.

export function makeRoom(overrides: Partial<Room> & Pick<Room, "id" | "floor" | "capacity">): Room {
  return {
    name: overrides.id,
    type: "reuniao",
    resources: [],
    accessibility: false,
    available: true,
    reservedForSectorId: null,
    ...overrides,
  };
}

export function makeTeam(overrides: Partial<Team> & Pick<Team, "id" | "size">): Team {
  return {
    sectorId: "sector-a",
    name: overrides.id,
    schedule: "integral",
    requiredResources: [],
    requiresAccessibility: false,
    floorPreference: null,
    priority: 2,
    proximityGroupId: null,
    ...overrides,
  };
}
