import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { runAllocation, runNaiveBaseline } from "@/lib/engine/allocate";
import type { AllocateOutput } from "@/lib/engine/allocate";
import type { ComparisonIndicator, Room, Team } from "@/lib/types";

function idleSeats(result: AllocateOutput, rooms: Room[], teams: Team[]): number {
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  return result.allocations.reduce((sum, a) => {
    const room = roomById.get(a.roomId);
    const team = teamById.get(a.teamId);
    if (!room || !team) return sum;
    return sum + Math.max(0, room.capacity - team.size);
  }, 0);
}

function avgOccupancyPct(result: AllocateOutput): number {
  if (result.allocations.length === 0) return 0;
  const sum = result.allocations.reduce((s, a) => s + a.occupancy, 0);
  return Math.round((sum / result.allocations.length) * 1000) / 10;
}

// Tela de comparação (seção 8): recalcula, a partir do estado atual de salas/equipes,
// a alocação "ingênua" (situação inicial / processo manual) e a alocação otimizada
// pelo motor, lado a lado.
export async function GET() {
  const rooms = store.getRooms();
  const teams = store.getTeams();
  const sectorExclusions = store.getSectorExclusions();

  const before = runNaiveBaseline({ rooms, teams, sectorExclusions });
  const after = runAllocation({ rooms, teams, sectorExclusions });

  const indicators: ComparisonIndicator[] = [
    {
      label: "Ocupação média das salas usadas",
      before: avgOccupancyPct(before),
      after: avgOccupancyPct(after),
      unit: "%",
      betterWhen: "higher",
    },
    {
      label: "Assentos ociosos (salas usadas)",
      before: idleSeats(before, rooms, teams),
      after: idleSeats(after, rooms, teams),
      unit: "un",
      betterWhen: "lower",
    },
    {
      label: "Equipes sem sala",
      before: before.exceptions.length,
      after: after.exceptions.length,
      unit: "un",
      betterWhen: "lower",
    },
    {
      label: "Restrições não atendidas (preferências de andar)",
      before: before.governance.softConstraintsUnmet,
      after: after.governance.softConstraintsUnmet,
      unit: "un",
      betterWhen: "lower",
    },
    {
      label: "Violações de restrição obrigatória",
      before: before.governance.hardConstraintsViolated,
      after: after.governance.hardConstraintsViolated,
      unit: "un",
      betterWhen: "lower",
    },
  ];

  return NextResponse.json({ before, after, indicators });
}
