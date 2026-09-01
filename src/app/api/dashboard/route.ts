import { NextResponse } from "next/server";
import { store } from "@/lib/store";

// Indicadores do dashboard executivo (seção 7 do enunciado). Baseado na última
// execução aceita/alterada do motor de alocação (ou na última execução disponível,
// se nenhuma foi aceita ainda).
export async function GET() {
  const rooms = store.getRooms();
  const teams = store.getTeams();
  const run = store.latestAcceptedOrLastRun();

  const allocations = run?.allocations ?? [];
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const occupiedRoomIds = new Set(allocations.map((a) => a.roomId));
  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
  const allocatedEmployees = allocations.reduce((s, a) => s + (teamById.get(a.teamId)?.size ?? 0), 0);

  const floors = Array.from({ length: 9 }, (_, i) => i + 1).map((floor) => {
    const floorRooms = rooms.filter((r) => r.floor === floor);
    const floorAllocations = allocations.filter((a) => roomById.get(a.roomId)?.floor === floor);
    const floorCapacity = floorRooms.reduce((s, r) => s + r.capacity, 0);
    const floorOccupied = floorAllocations.reduce((s, a) => s + (teamById.get(a.teamId)?.size ?? 0), 0);
    return {
      floor,
      rooms: floorRooms.length,
      roomsOccupied: floorAllocations.length,
      capacity: floorCapacity,
      occupiedSeats: floorOccupied,
      utilizationPct: floorCapacity ? Math.round((floorOccupied / floorCapacity) * 1000) / 10 : 0,
    };
  });

  const unallocatedTeams = run?.exceptions.length ?? 0;

  return NextResponse.json({
    hasRun: Boolean(run),
    runId: run?.runId ?? null,
    runStatus: run?.status ?? null,
    // "Ocupação do prédio" (funcionários alocados / capacidade de TODAS as salas,
    // ocupadas ou não) e "ocupação das salas usadas" (só as salas efetivamente
    // escolhidas pelo motor) são métricas DIFERENTES e propositalmente distintas —
    // a primeira mostra o quanto do prédio como um todo está em uso; a segunda,
    // quão bem encaixadas estão as equipes nas salas que o motor escolheu. Ver
    // README, seção "Dashboard executivo", para a explicação completa.
    buildingOccupationPct: totalCapacity ? Math.round((allocatedEmployees / totalCapacity) * 1000) / 10 : 0,
    usedRoomsOccupancyPct: run?.governance.predictedOccupancyPct ?? 0,
    totalCapacity,
    allocatedEmployees,
    totalEmployeesInTeams: teams.reduce((s, t) => s + t.size, 0),
    teamsAllocated: allocations.length,
    teamsUnallocated: unallocatedTeams,
    roomsAvailable: rooms.filter((r) => r.available && !occupiedRoomIds.has(r.id)).length,
    roomsOccupied: occupiedRoomIds.size,
    roomsTotal: rooms.length,
    constraintsViolated: run?.governance.hardConstraintsViolated ?? 0,
    softConstraintsUnmet: run?.governance.softConstraintsUnmet ?? 0,
    floors,
  });
}
