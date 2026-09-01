import { describe, expect, it } from "vitest";
import { runAllocation } from "@/lib/engine/allocate";
import { makeRoom, makeTeam } from "./testUtils";

// Teste 3 — Remoção de restrição (teste metamórfico).
// "Se uma restrição for removida, o espaço de soluções possíveis aumenta. Portanto, a
// nova solução não deveria apresentar menos possibilidades exclusivamente por causa
// da retirada daquela restrição."
//
// Cenário minimalista e controlado (não usa os dados de seed) para isolar exatamente
// o efeito de cada restrição, uma de cada vez.
describe("Motor de alocação — propriedade metamórfica: remoção de restrição", () => {
  it("remover a exigência de acessibilidade de uma equipe nunca piora o resultado", () => {
    const rooms = [makeRoom({ id: "R1", floor: 1, capacity: 10, accessibility: false })];
    const teamWithConstraint = [makeTeam({ id: "t1", size: 5, requiresAccessibility: true })];
    const teamWithoutConstraint = [makeTeam({ id: "t1", size: 5, requiresAccessibility: false })];

    const before = runAllocation({ rooms, teams: teamWithConstraint, sectorExclusions: [] });
    const after = runAllocation({ rooms, teams: teamWithoutConstraint, sectorExclusions: [] });

    expect(before.governance.teamsAllocated).toBe(0);
    expect(before.exceptions[0]?.reason).toBe("sem_sala_acessivel");
    expect(after.governance.teamsAllocated).toBe(1);
    expect(after.governance.teamsAllocated).toBeGreaterThanOrEqual(before.governance.teamsAllocated);
  });

  it("remover uma restrição de coexistência entre setores nunca reduz o número de equipes alocadas", () => {
    const rooms = [makeRoom({ id: "R1", floor: 2, capacity: 20 }), makeRoom({ id: "R2", floor: 2, capacity: 20 })];
    const teams = [
      makeTeam({ id: "t1", size: 10, sectorId: "comercial" }),
      makeTeam({ id: "t2", size: 10, sectorId: "juridico" }),
    ];
    // Restrição artificialmente forte: comercial e jurídico não podem dividir o 2º
    // andar, e é o único andar disponível no cenário — logo uma das equipes fica sem
    // sala mesmo havendo salas fisicamente livres.
    const exclusion = [{ id: "excl1", sectorAId: "comercial", sectorBId: "juridico", reason: "teste" }];

    const before = runAllocation({ rooms, teams, sectorExclusions: exclusion });
    const after = runAllocation({ rooms, teams, sectorExclusions: [] });

    expect(before.governance.teamsAllocated).toBe(1);
    expect(after.governance.teamsAllocated).toBe(2);
    expect(after.governance.teamsAllocated).toBeGreaterThanOrEqual(before.governance.teamsAllocated);
  });

  it("aumentar a capacidade de uma sala (relaxar a restrição de capacidade mínima) nunca reduz o número de equipes alocadas", () => {
    const teams = [makeTeam({ id: "t1", size: 15 })];
    const before = runAllocation({ rooms: [makeRoom({ id: "R1", floor: 1, capacity: 10 })], teams, sectorExclusions: [] });
    const after = runAllocation({ rooms: [makeRoom({ id: "R1", floor: 1, capacity: 20 })], teams, sectorExclusions: [] });

    expect(before.governance.teamsAllocated).toBe(0);
    expect(after.governance.teamsAllocated).toBe(1);
    expect(after.governance.teamsAllocated).toBeGreaterThanOrEqual(before.governance.teamsAllocated);
  });
});
