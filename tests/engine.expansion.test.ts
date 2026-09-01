import { describe, expect, it } from "vitest";
import { runAllocation } from "@/lib/engine/allocate";
import { seedRooms, seedSectorExclusions, seedTeams } from "@/lib/seed-data";
import { makeRoom } from "./testUtils";

// Teste 2 — Expansão da capacidade (teste metamórfico).
// "Se adicionarmos uma nova sala ao prédio e não alterarmos nenhuma outra condição, a
// quantidade de equipes possíveis de alocar não deveria diminuir."
//
// Não sabemos qual é a alocação ótima para o cenário completo — por isso este teste
// não verifica um resultado exato, e sim uma RELAÇÃO esperada entre duas execuções.
// O cenário de seed já contém um caso propositalmente sem solução (Equipe Operações
// Delta, 92 pessoas — nenhuma sala do prédio comporta mais que 80): é o caso descrito
// na seção 11 do enunciado, usado aqui para validar a propriedade de expansão.
describe("Motor de alocação — propriedade metamórfica: expansão da capacidade", () => {
  it("adicionar uma sala compatível nunca reduz o número de equipes alocadas", () => {
    const rooms = seedRooms();
    const teams = seedTeams();
    const sectorExclusions = seedSectorExclusions();

    const before = runAllocation({ rooms, teams, sectorExclusions });
    const allocatedBefore = new Set(before.allocations.map((a) => a.teamId));

    // A maior sala do cenário original comporta 80 pessoas — a Equipe Operações Delta
    // (92 pessoas) fica necessariamente sem alocação (ver teste de exceções).
    expect(before.exceptions.some((e) => e.teamId === "t19")).toBe(true);

    const newRoom = makeRoom({ id: "S199", floor: 1, capacity: 100 });
    const expandedRooms = [...rooms, newRoom];
    const after = runAllocation({ rooms: expandedRooms, teams, sectorExclusions });
    const allocatedAfter = new Set(after.allocations.map((a) => a.teamId));

    expect(after.governance.teamsAllocated).toBeGreaterThanOrEqual(before.governance.teamsAllocated);
    // A equipe que antes era uma exceção agora deve caber na sala nova.
    expect(allocatedAfter.has("t19")).toBe(true);
    // Nenhuma equipe que já estava alocada deveria "perder a sala" só porque uma nova
    // opção apareceu no prédio.
    for (const teamId of allocatedBefore) {
      expect(allocatedAfter.has(teamId)).toBe(true);
    }
  });

  it("adicionar uma sala nunca aumenta o número de restrições obrigatórias violadas (que deve seguir em zero)", () => {
    const rooms = seedRooms();
    const teams = seedTeams();
    const sectorExclusions = seedSectorExclusions();

    const before = runAllocation({ rooms, teams, sectorExclusions });
    const after = runAllocation({ rooms: [...rooms, makeRoom({ id: "S199", floor: 1, capacity: 100 })], teams, sectorExclusions });

    expect(before.governance.hardConstraintsViolated).toBe(0);
    expect(after.governance.hardConstraintsViolated).toBe(0);
  });
});
