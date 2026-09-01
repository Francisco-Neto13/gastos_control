import { describe, expect, it } from "vitest";
import { runAllocation } from "@/lib/engine/allocate";
import { seedRooms, seedSectorExclusions, seedTeams } from "@/lib/seed-data";

// Teste 1 — Capacidade (critério de aceitação nº 1 do enunciado).
// "Se uma sala possui capacidade para 30 pessoas, nenhuma recomendação válida poderá
// colocar 31 pessoas nela." Esta é a invariante mais básica e mais importante do
// sistema: independentemente de quão boa (ou ruim) for a heurística de otimização,
// ela NUNCA pode propor uma alocação fisicamente impossível.
describe("Motor de alocação — invariante de capacidade", () => {
  it("nunca aloca uma equipe em uma sala menor que o seu tamanho", () => {
    const rooms = seedRooms();
    const teams = seedTeams();
    const sectorExclusions = seedSectorExclusions();

    const { allocations } = runAllocation({ rooms, teams, sectorExclusions });

    const roomById = new Map(rooms.map((r) => [r.id, r]));
    const teamById = new Map(teams.map((t) => [t.id, t]));

    expect(allocations.length).toBeGreaterThan(0);
    for (const allocation of allocations) {
      const room = roomById.get(allocation.roomId)!;
      const team = teamById.get(allocation.teamId)!;
      expect(team.size).toBeLessThanOrEqual(room.capacity);
      expect(allocation.occupancy).toBeLessThanOrEqual(1);
    }
  });

  it("nunca aloca duas equipes na mesma sala em horários que se sobrepõem", () => {
    const rooms = seedRooms();
    const teams = seedTeams();
    const sectorExclusions = seedSectorExclusions();

    const { allocations } = runAllocation({ rooms, teams, sectorExclusions });
    const teamById = new Map(teams.map((t) => [t.id, t]));

    const byRoom = new Map<string, string[]>();
    for (const a of allocations) {
      byRoom.set(a.roomId, [...(byRoom.get(a.roomId) ?? []), a.teamId]);
    }
    for (const [, teamIds] of byRoom) {
      if (teamIds.length < 2) continue;
      const schedules = teamIds.map((id) => teamById.get(id)!.schedule);
      const hasIntegral = schedules.includes("integral");
      const distinctNonIntegral = new Set(schedules.filter((s) => s !== "integral"));
      // Só é seguro compartilhar a sala se nenhuma equipe for "integral" e as demais
      // ocuparem turnos diferentes entre si.
      expect(hasIntegral).toBe(false);
      expect(distinctNonIntegral.size).toBe(schedules.length);
    }
  });
});
