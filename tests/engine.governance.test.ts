import { describe, expect, it } from "vitest";
import { ALGORITHM_VERSION, runAllocation } from "@/lib/engine/allocate";
import { seedRooms, seedSectorExclusions, seedTeams } from "@/lib/seed-data";

// Cobre a seção 12 (governança) e o critério de aceitação de tempo de resposta.
describe("Motor de alocação — governança e desempenho", () => {
  it("cada execução carrega versão do algoritmo, contagens e nunca reporta violação de restrição obrigatória", () => {
    const rooms = seedRooms();
    const teams = seedTeams();
    const sectorExclusions = seedSectorExclusions();

    const { governance } = runAllocation({ rooms, teams, sectorExclusions });

    expect(governance.algorithmVersion).toBe(ALGORITHM_VERSION);
    expect(governance.teamsAnalyzed).toBe(teams.length);
    expect(governance.roomsAnalyzed).toBe(rooms.length);
    expect(governance.teamsAllocated + governance.teamsUnallocated).toBe(teams.length);
    expect(governance.hardConstraintsViolated).toBe(0);
    expect(governance.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("gera uma recomendação para o cenário completo do prédio em menos de 2 segundos", () => {
    const rooms = seedRooms();
    const teams = seedTeams();
    const sectorExclusions = seedSectorExclusions();

    const start = Date.now();
    runAllocation({ rooms, teams, sectorExclusions });
    const elapsed = Date.now() - start;

    // Critério de aceitação: recomendações produzidas dentro de um limite de tempo
    // definido pela equipe (ver README, seção "Critérios de aceitação").
    expect(elapsed).toBeLessThan(2000);
  });
});
