import { describe, expect, it } from "vitest";
import { runAllocation } from "@/lib/engine/allocate";
import { seedRooms, seedSectorExclusions, seedTeams } from "@/lib/seed-data";
import { makeRoom, makeTeam } from "./testUtils";

// Teste 4 — Equipes equivalentes (teste metamórfico).
// "Se duas equipes possuem exatamente os mesmos requisitos, pequenas alterações
// irrelevantes em seus nomes não deveriam alterar drasticamente a qualidade global
// da solução."
//
// O nome de uma equipe não é (e não deveria ser) usado por nenhuma regra de
// pontuação do motor — por isso, para este algoritmo, a propriedade pode ser
// verificada como uma igualdade exata das métricas globais, não apenas "parecida".
describe("Motor de alocação — propriedade metamórfica: irrelevância do nome da equipe", () => {
  it("renomear uma equipe não muda a alocação nem as métricas globais", () => {
    const rooms = seedRooms();
    const teams = seedTeams();
    const sectorExclusions = seedSectorExclusions();

    const before = runAllocation({ rooms, teams, sectorExclusions });

    const renamedTeams = teams.map((t) => (t.id === "t01" ? { ...t, name: "Desenvolvimento A (equipe renomeada)" } : t));
    const after = runAllocation({ rooms, teams: renamedTeams, sectorExclusions });

    expect(after.governance.teamsAllocated).toBe(before.governance.teamsAllocated);
    expect(after.governance.predictedOccupancyPct).toBe(before.governance.predictedOccupancyPct);
    expect(after.governance.softConstraintsUnmet).toBe(before.governance.softConstraintsUnmet);

    const roomBefore = before.allocations.find((a) => a.teamId === "t01")?.roomId;
    const roomAfter = after.allocations.find((a) => a.teamId === "t01")?.roomId;
    expect(roomAfter).toBe(roomBefore);
  });

  it("duas equipes com requisitos idênticos, diferindo só em id/nome, recebem tratamento equivalente (mesmo score de sala)", () => {
    const rooms = [
      makeRoom({ id: "R1", floor: 3, capacity: 15 }),
      makeRoom({ id: "R2", floor: 3, capacity: 15 }),
    ];
    const specs = { size: 12, schedule: "integral" as const, priority: 2 as const, floorPreference: 3 };
    const teamsOrderA = [makeTeam({ id: "alpha", name: "Equipe Alpha", ...specs }), makeTeam({ id: "beta", name: "Equipe Beta", ...specs })];
    const teamsOrderB = [makeTeam({ id: "beta", name: "Equipe Beta", ...specs }), makeTeam({ id: "alpha", name: "Equipe Alpha", ...specs })];

    const resultA = runAllocation({ rooms, teams: teamsOrderA, sectorExclusions: [] });
    const resultB = runAllocation({ rooms, teams: teamsOrderB, sectorExclusions: [] });

    // A ordem de entrada / o nome não deveria mudar a qualidade agregada da solução:
    // ambas as equipes cabem em qualquer uma das duas salas idênticas.
    expect(resultA.governance.teamsAllocated).toBe(resultB.governance.teamsAllocated);
    expect(resultA.governance.predictedOccupancyPct).toBe(resultB.governance.predictedOccupancyPct);

    const scoresA = resultA.allocations.map((a) => a.scoreBreakdown.total).sort();
    const scoresB = resultB.allocations.map((a) => a.scoreBreakdown.total).sort();
    expect(scoresA).toEqual(scoresB);
  });
});
