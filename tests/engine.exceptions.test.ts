import { describe, expect, it } from "vitest";
import { runAllocation } from "@/lib/engine/allocate";
import { seedRooms, seedSectorExclusions, seedTeams } from "@/lib/seed-data";
import { makeRoom, makeTeam } from "./testUtils";

// Cobre a seção 11 do enunciado (tratamento de exceções) e o critério de aceitação
// "todas as equipes não alocadas deverão possuir motivo registrado".
describe("Motor de alocação — tratamento de exceções", () => {
  it("identifica a Equipe Operações Delta (92 pessoas) como exceção, sem forçar uma alocação inválida", () => {
    const rooms = seedRooms();
    const teams = seedTeams();
    const sectorExclusions = seedSectorExclusions();

    const { allocations, exceptions } = runAllocation({ rooms, teams, sectorExclusions });

    expect(allocations.some((a) => a.teamId === "t19")).toBe(false);
    const delta = exceptions.find((e) => e.teamId === "t19");
    expect(delta).toBeDefined();
    expect(delta!.reason).toBe("sem_sala_com_capacidade");
    expect(delta!.cause).toMatch(/92/); // tamanho da equipe, presente na causa registrada
    expect(delta!.suggestion).toMatch(/80/); // maior sala do prédio no cenário de seed
    expect(delta!.suggestion.length).toBeGreaterThan(0);
  });

  it("toda exceção possui equipe, restrição, causa e encaminhamento preenchidos (100% justificadas)", () => {
    const rooms = seedRooms();
    const teams = seedTeams();
    const sectorExclusions = seedSectorExclusions();

    const { exceptions } = runAllocation({ rooms, teams, sectorExclusions });
    expect(exceptions.length).toBeGreaterThan(0);
    for (const ex of exceptions) {
      expect(ex.teamId).toBeTruthy();
      expect(ex.teamName).toBeTruthy();
      expect(ex.reason).toBeTruthy();
      expect(ex.cause.length).toBeGreaterThan(0);
      expect(ex.suggestion.length).toBeGreaterThan(0);
    }
  });

  it("não confunde 'sala bloqueada, mas do tamanho certo' com 'nenhuma sala do prédio comporta a equipe'", () => {
    // Reproduz um cenário observado na demonstração: uma sala com capacidade
    // suficiente existe, mas está bloqueada por manutenção; todas as demais salas
    // são pequenas demais. A causa relatada não pode citar a sala bloqueada como se
    // ela fosse irrelevante ao tamanho da equipe, nem esconder que uma sala do
    // tamanho certo existe (ainda que indisponível agora).
    const rooms = [
      makeRoom({ id: "R1", floor: 1, capacity: 10 }),
      makeRoom({ id: "R2", floor: 1, capacity: 15 }),
      makeRoom({ id: "R907", floor: 9, capacity: 50, available: false }),
    ];
    const teams = [makeTeam({ id: "t1", name: "Olheiros para Tech", size: 40 })];

    const { exceptions } = runAllocation({ rooms, teams, sectorExclusions: [] });
    expect(exceptions).toHaveLength(1);
    const [ex] = exceptions;
    expect(ex.reason).toBe("sem_sala_com_capacidade");
    // A causa deve deixar claro que UMA sala do tamanho certo existe, mas está
    // bloqueada — não que "nenhuma sala do prédio comporta 40 pessoas" (falso: R907
    // comportaria) nem apenas "a sala X está indisponível" sem relação com o tamanho.
    expect(ex.cause).toMatch(/capacidade suficiente/i);
    expect(ex.cause).toMatch(/R907|50/);
    expect(ex.cause).toMatch(/indispon[íi]vel|manuten[çc][ãa]o|bloqueio/i);
    expect(ex.suggestion).toMatch(/bloqueada|manuten[çc][ãa]o/i);
  });

  it("não aponta a indisponibilidade de uma sala irrelevante quando o motivo universal é outro (recursos)", () => {
    // Variante do cenário acima: aqui NENHUMA sala tem capacidade insuficiente — a
    // sala bloqueada (R907) é, por coincidência, a única com o recurso exigido pela
    // equipe. Antes da correção, o motivo relatado citava "R907 indisponível" (por
    // ela mesma falhar na checagem de disponibilidade, que compartilhava o rótulo
    // "sem_sala_com_capacidade"), escondendo que as outras 3 salas — todas do
    // tamanho certo — falhavam por falta do recurso, não de capacidade.
    const rooms = [
      makeRoom({ id: "R1", floor: 1, capacity: 50 }),
      makeRoom({ id: "R2", floor: 1, capacity: 50 }),
      makeRoom({ id: "R3", floor: 1, capacity: 50 }),
      makeRoom({ id: "R907", floor: 9, capacity: 50, resources: ["bancada_lab"], available: false }),
    ];
    const teams = [makeTeam({ id: "t1", name: "Laboratório de Testes", size: 40, requiredResources: ["bancada_lab"] })];

    const { exceptions } = runAllocation({ rooms, teams, sectorExclusions: [] });
    expect(exceptions).toHaveLength(1);
    const [ex] = exceptions;
    expect(ex.reason).toBe("sem_sala_com_recursos");
    expect(ex.cause).toMatch(/bancada_lab/);
    // A causa real é falta de recurso nas salas disponíveis — não a indisponibilidade
    // da sala bloqueada, que é irrelevante aqui (as outras 3 salas já são grandes o
    // bastante, então "capacidade" pode até ser mencionada de passagem, mas o motivo
    // classificado e a sala bloqueada não podem aparecer como a causa da exceção).
    expect(ex.cause).not.toMatch(/R907/);
    expect(ex.cause).not.toMatch(/indispon[íi]vel|manuten[çc][ãa]o|bloqueio/i);
  });

  it("toda recomendação possui uma explicação não vazia (100% de explicabilidade)", () => {
    const rooms = seedRooms();
    const teams = seedTeams();
    const sectorExclusions = seedSectorExclusions();

    const { allocations } = runAllocation({ rooms, teams, sectorExclusions });
    expect(allocations.length).toBeGreaterThan(0);
    for (const a of allocations) {
      expect(a.explanation.length).toBeGreaterThan(20);
      expect(a.alternativesEvaluated).toBeGreaterThan(0);
    }
  });
});
