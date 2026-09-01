import type {
  AllocationEntry,
  AllocationException,
  ExceptionReason,
  Room,
  Schedule,
  SectorExclusion,
  Team,
} from "../types";
import { schedulesOverlap, scoreCandidate, type ScoreBreakdown } from "./scoring";

// Versão do algoritmo de alocação. Registrada em cada execução (governança) para que
// seja possível responder "qual versão do mecanismo produziu este resultado?".
// Qualquer mudança nas regras/pesos abaixo deve incrementar esta versão.
export const ALGORITHM_VERSION = "allocation-engine-v1";

interface RoomUsage {
  team: Team;
  schedule: Schedule;
}

export interface AllocateInput {
  rooms: Room[];
  teams: Team[];
  sectorExclusions: SectorExclusion[];
}

export interface AllocateGovernanceSummary {
  algorithmVersion: string;
  durationMs: number;
  teamsAnalyzed: number;
  roomsAnalyzed: number;
  teamsAllocated: number;
  teamsUnallocated: number;
  softConstraintsUnmet: number;
  hardConstraintsViolated: number;
  predictedOccupancyPct: number;
}

export interface AllocateOutput {
  allocations: AllocationEntry[];
  exceptions: AllocationException[];
  governance: AllocateGovernanceSummary;
}

type ConstraintCheck = { ok: true } | { ok: false; reason: ExceptionReason; cause: string };

// Restrições "estáticas": dependem só das especificações da sala e da equipe, nunca
// de QUANDO o motor está processando (não dependem de outras equipes já alocadas).
// Separadas das restrições "dinâmicas" (agenda/exclusão de setor) para permitir um
// diagnóstico de exceção correto — ver explainNoCandidate.
function staticEligibility(team: Team, room: Room): ConstraintCheck {
  if (!room.available) {
    return { ok: false, reason: "sem_sala_com_capacidade", cause: `Sala ${room.name} está indisponível (manutenção/bloqueio).` };
  }
  if (room.capacity < team.size) {
    return {
      ok: false,
      reason: "sem_sala_com_capacidade",
      cause: `Capacidade da sala ${room.name} (${room.capacity}) é menor que o tamanho da equipe (${team.size}).`,
    };
  }
  if (team.requiresAccessibility && !room.accessibility) {
    return { ok: false, reason: "sem_sala_acessivel", cause: `Equipe requer acessibilidade e a sala ${room.name} não oferece.` };
  }
  const missingResources = team.requiredResources.filter((r) => !room.resources.includes(r));
  if (missingResources.length > 0) {
    return {
      ok: false,
      reason: "sem_sala_com_recursos",
      cause: `Sala ${room.name} não possui os recursos exigidos: ${missingResources.join(", ")}.`,
    };
  }
  if (room.reservedForSectorId && room.reservedForSectorId !== team.sectorId) {
    return { ok: false, reason: "sala_reservada_indisponivel", cause: `Sala ${room.name} é reservada para outro setor.` };
  }
  return { ok: true };
}

function hardConstraintsFilter(
  team: Team,
  room: Room,
  roomUsage: Map<string, RoomUsage[]>,
  floorUsage: Map<number, RoomUsage[]>,
  sectorExclusions: SectorExclusion[],
): ConstraintCheck {
  const staticCheck = staticEligibility(team, room);
  if (!staticCheck.ok) return staticCheck;

  const usage = roomUsage.get(room.id) ?? [];
  if (usage.some((u) => schedulesOverlap(u.schedule, team.schedule))) {
    return { ok: false, reason: "conflito_horario", cause: `Sala ${room.name} já está ocupada em horário conflitante.` };
  }

  const sameFloor = floorUsage.get(room.floor) ?? [];
  const exclusionHit = sameFloor.find((u) => {
    if (!schedulesOverlap(u.schedule, team.schedule)) return false;
    return sectorExclusions.some(
      (ex) =>
        (ex.sectorAId === team.sectorId && ex.sectorBId === u.team.sectorId) ||
        (ex.sectorBId === team.sectorId && ex.sectorAId === u.team.sectorId),
    );
  });
  if (exclusionHit) {
    return {
      ok: false,
      reason: "restricao_setor_exclusivo",
      cause: `O setor de "${team.name}" não pode compartilhar o ${room.floor}º andar com o setor de "${exclusionHit.team.name}" no mesmo horário.`,
    };
  }

  return { ok: true };
}

// Diagnostica POR QUE uma equipe não recebeu nenhuma sala, distinguindo os casos
// possíveis (essencial para a explicabilidade — seção 11 do enunciado). A busca
// "descasca" uma restrição de cada vez, da mais estrutural para a mais específica —
// capacidade → disponibilidade → acessibilidade → recursos → reserva → agenda/
// exclusão de setor — sempre citando um exemplo concreto de sala que já satisfaz
// tudo o que foi verificado até ali. Isso evita o erro de apontar como causa a
// primeira sala do inventário que falhar por acaso (ex.: uma sala pequena e
// irrelevante, ou uma sala grande que só por coincidência está em manutenção),
// mesmo quando a verdadeira limitação é outra.
function explainNoCandidate(
  team: Team,
  rooms: Room[],
  roomUsage: Map<string, RoomUsage[]>,
  floorUsage: Map<number, RoomUsage[]>,
  sectorExclusions: SectorExclusion[],
): { reason: ExceptionReason; cause: string } {
  const staticChecks = rooms.map((room) => ({ room, check: staticEligibility(team, room) }));
  const staticOk = staticChecks.filter((c) => c.check.ok).map((c) => c.room);

  if (staticOk.length === 0) {
    let candidates = rooms.filter((r) => r.capacity >= team.size);
    if (candidates.length === 0) {
      const maxCapacity = Math.max(0, ...rooms.map((r) => r.capacity));
      return {
        reason: "sem_sala_com_capacidade",
        cause: `Nenhuma sala do prédio comporta ${team.size} pessoas — a maior sala existente tem capacidade para ${maxCapacity}.`,
      };
    }

    const availableCandidates = candidates.filter((r) => r.available);
    if (availableCandidates.length === 0) {
      const example = candidates[0];
      return {
        reason: "sem_sala_com_capacidade",
        cause: `Havia sala(s) com capacidade suficiente para a equipe (ex.: ${example.name}, ${example.capacity} lugares), mas está(ão) indisponível(is) por manutenção/bloqueio.`,
      };
    }
    candidates = availableCandidates;

    if (team.requiresAccessibility) {
      const accessible = candidates.filter((r) => r.accessibility);
      if (accessible.length === 0) {
        return {
          reason: "sem_sala_acessivel",
          cause: `Havia sala(s) disponível(is) com capacidade suficiente (ex.: ${candidates[0].name}), mas nenhuma delas oferece acessibilidade, exigida por esta equipe.`,
        };
      }
      candidates = accessible;
    }

    if (team.requiredResources.length > 0) {
      const withResources = candidates.filter((r) => team.requiredResources.every((res) => r.resources.includes(res)));
      if (withResources.length === 0) {
        return {
          reason: "sem_sala_com_recursos",
          cause: `Havia sala(s) disponível(is), com capacidade suficiente e (se exigido) acessível(is) (ex.: ${candidates[0].name}), mas nenhuma reúne todos os recursos exigidos: ${team.requiredResources.join(", ")}.`,
        };
      }
      candidates = withResources;
    }

    const notReserved = candidates.filter((r) => !r.reservedForSectorId || r.reservedForSectorId === team.sectorId);
    if (notReserved.length === 0) {
      return {
        reason: "sala_reservada_indisponivel",
        cause: `Havia sala(s) que atendem capacidade, acessibilidade e recursos (ex.: ${candidates[0].name}), mas está(ão) reservada(s) para outro setor.`,
      };
    }

    // Não deveria ser alcançável: se sobrou algum candidato aqui, ele satisfaz todas
    // as restrições estáticas e já deveria constar em staticOk. Mantido como rede de
    // segurança para nunca deixar uma exceção sem causa.
    return {
      reason: "sem_sala_com_capacidade",
      cause: "Nenhuma sala compatível foi encontrada no inventário atual.",
    };
  }

  // Existem salas com especificação compatível — a exceção é de agenda/concorrência.
  for (const room of staticOk) {
    const sameFloor = floorUsage.get(room.floor) ?? [];
    const exclusionHit = sameFloor.find(
      (u) =>
        schedulesOverlap(u.schedule, team.schedule) &&
        sectorExclusions.some(
          (ex) =>
            (ex.sectorAId === team.sectorId && ex.sectorBId === u.team.sectorId) ||
            (ex.sectorBId === team.sectorId && ex.sectorAId === u.team.sectorId),
        ),
    );
    if (exclusionHit) {
      return {
        reason: "restricao_setor_exclusivo",
        cause: `Havia ${staticOk.length} sala(s) compatível(is) por especificação (ex.: ${room.name}), mas o setor de "${team.name}" não pode compartilhar o ${room.floor}º andar com o setor de "${exclusionHit.team.name}" no mesmo horário.`,
      };
    }
  }

  return {
    reason: "conflito_horario",
    cause: `Havia ${staticOk.length} sala(s) compatível(is) por especificação (ex.: ${staticOk[0].name}), mas todas já estavam ocupadas em horário conflitante no momento em que esta equipe foi processada.`,
  };
}

function suggestionFor(reason: ExceptionReason, team: Team, rooms: Room[]): string {
  switch (reason) {
    case "sem_sala_com_capacidade": {
      const maxCapacityAvailable = Math.max(0, ...rooms.filter((r) => r.available).map((r) => r.capacity));
      const maxCapacityAny = Math.max(0, ...rooms.map((r) => r.capacity));
      if (maxCapacityAny > maxCapacityAvailable && maxCapacityAny >= team.size) {
        // Existe uma sala do tamanho certo no prédio, mas está bloqueada — o
        // encaminhamento mais direto é reavaliar esse bloqueio, não o inventário.
        return `Existe uma sala com capacidade suficiente (${maxCapacityAny} lugares), mas ela está bloqueada/em manutenção. Considere reavaliar a liberação dessa sala antes de outras alternativas.`;
      }
      return `A maior sala disponível no prédio comporta ${maxCapacityAvailable} pessoas. Considere dividir a equipe em subgrupos, liberar uma sala reservada de outro setor ou avaliar a locação de um espaço adicional.`;
    }
    case "sem_sala_acessivel":
      return "Nenhuma sala com acessibilidade e capacidade suficiente está disponível. Considere adaptar uma sala próxima com as adequações necessárias.";
    case "sem_sala_com_recursos":
      return `Nenhuma sala disponível reúne todos os recursos exigidos (${team.requiredResources.join(", ") || "n/a"}). Considere equipar uma sala existente ou usar equipamento portátil.`;
    case "sala_reservada_indisponivel":
      return "A(s) sala(s) compatível(is) está(ão) reservada(s) para outro setor. Solicite liberação temporária ao Coordenador Geral.";
    case "conflito_horario":
      return "Todas as salas compatíveis já estão ocupadas nesse horário. Considere ajustar o horário da equipe ou negociar rodízio de uso.";
    case "restricao_setor_exclusivo":
      return "Há conflito de coexistência entre setores no mesmo andar e horário. Considere alocar em outro andar ou turno.";
  }
}

function buildExplanation(team: Team, room: Room, breakdown: ScoreBreakdown, alternativesEvaluated: number): string {
  const occupancyPct = Math.round((team.size / room.capacity) * 100);
  const resourcesOk = team.requiredResources.length === 0 || team.requiredResources.every((r) => room.resources.includes(r));
  const accessibilityOk = !team.requiresAccessibility || room.accessibility;
  const floorLine =
    team.floorPreference == null
      ? "Sem preferência de andar informada."
      : team.floorPreference === room.floor
        ? "Restrição de andar atendida: sim."
        : `Restrição de andar atendida: não (preferência: ${team.floorPreference}º andar, alocado no ${room.floor}º).`;

  return [
    `Sala ${room.name} recomendada para a equipe "${team.name}".`,
    `Capacidade da sala: ${room.capacity} pessoas. Equipe: ${team.size} pessoas. Ocupação prevista: ${occupancyPct}%.`,
    `Recursos necessários atendidos: ${team.requiredResources.length === 0 ? "não se aplica" : resourcesOk ? "sim" : "não"}.`,
    `Acessibilidade obrigatória atendida: ${team.requiresAccessibility ? (accessibilityOk ? "sim" : "não") : "não se aplica"}.`,
    floorLine,
    `Alternativas avaliadas: ${alternativesEvaluated}.`,
    `Esta sala apresentou o melhor equilíbrio entre ocupação (${breakdown.occupancy}/100), localização (${breakdown.floorPreference}/100), recursos (${breakdown.resourceMatch}/100) e proximidade com equipes relacionadas (${breakdown.proximity}/100) dentre as alternativas disponíveis — score final ${breakdown.total}/100.`,
  ].join(" ");
}

interface Assignment {
  room: Room;
  breakdown: ScoreBreakdown;
  alternativesEvaluated: number;
}

// Melhoria local por troca de salas entre pares de equipes já alocadas. Nunca remove
// uma equipe da alocação (por isso não afeta a contagem de equipes alocadas) — apenas
// melhora o equilíbrio geral quando uma troca beneficia a soma dos scores das duas
// equipes envolvidas, respeitando todas as restrições rígidas.
function buildUsageFromAssignments(
  assignments: Map<string, Assignment>,
  teamById: Map<string, Team>,
): { roomUsage: Map<string, RoomUsage[]>; floorUsage: Map<number, RoomUsage[]> } {
  const roomUsage = new Map<string, RoomUsage[]>();
  const floorUsage = new Map<number, RoomUsage[]>();
  for (const [teamId, assignment] of assignments) {
    const team = teamById.get(teamId);
    if (!team) continue;
    const usageEntry: RoomUsage = { team, schedule: team.schedule };
    roomUsage.set(assignment.room.id, [...(roomUsage.get(assignment.room.id) ?? []), usageEntry]);
    floorUsage.set(assignment.room.floor, [...(floorUsage.get(assignment.room.floor) ?? []), usageEntry]);
  }
  return { roomUsage, floorUsage };
}

function improveWithSwaps(assignments: Map<string, Assignment>, teams: Team[], sectorExclusions: SectorExclusion[]) {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const ids = [...assignments.keys()];

  for (let pass = 0; pass < 2; pass++) {
    let improved = false;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const teamA = teamById.get(ids[i]);
        const teamB = teamById.get(ids[j]);
        if (!teamA || !teamB) continue;
        const assignA = assignments.get(teamA.id)!;
        const assignB = assignments.get(teamB.id)!;
        if (assignA.room.id === assignB.room.id) continue;

        // Reavalia as MESMAS restrições rígidas usadas na alocação inicial, mas
        // considerando o uso das salas por TODAS as demais equipes já alocadas
        // (que pode incluir outras equipes dividindo a mesma sala em horários
        // diferentes). Sem isso, uma troca poderia "empurrar" uma equipe para uma
        // sala já ocupada em horário conflitante — o que violaria uma restrição
        // rígida que a primeira passada nunca teria permitido.
        const others = new Map(assignments);
        others.delete(teamA.id);
        others.delete(teamB.id);
        const { roomUsage, floorUsage } = buildUsageFromAssignments(others, teamById);

        const aFitsRoomB = hardConstraintsFilter(teamA, assignB.room, roomUsage, floorUsage, sectorExclusions);
        const bFitsRoomA = hardConstraintsFilter(teamB, assignA.room, roomUsage, floorUsage, sectorExclusions);
        if (!aFitsRoomB.ok || !bFitsRoomA.ok) continue;

        const newBreakdownA = scoreCandidate(teamA, assignB.room, []);
        const newBreakdownB = scoreCandidate(teamB, assignA.room, []);
        const before = assignA.breakdown.total + assignB.breakdown.total;
        const after = newBreakdownA.total + newBreakdownB.total;
        if (after > before + 0.01) {
          assignments.set(teamA.id, { room: assignB.room, breakdown: newBreakdownA, alternativesEvaluated: assignA.alternativesEvaluated });
          assignments.set(teamB.id, { room: assignA.room, breakdown: newBreakdownB, alternativesEvaluated: assignB.alternativesEvaluated });
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
}

export function runAllocation(input: AllocateInput): AllocateOutput {
  const start = Date.now();
  const { rooms, teams, sectorExclusions } = input;

  const roomUsage = new Map<string, RoomUsage[]>();
  const floorUsage = new Map<number, RoomUsage[]>();
  const proximityFloorsByGroup = new Map<string, number[]>();
  const assignments = new Map<string, Assignment>();
  const exceptions: AllocationException[] = [];

  // Prioridade 1 = mais alta, processada primeiro. Em empate, equipes maiores primeiro
  // (são as mais difíceis de encaixar e devem ter a primeira escolha de sala).
  const orderedTeams = [...teams].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.size - a.size;
  });

  for (const team of orderedTeams) {
    const checks = rooms.map((room) => ({ room, check: hardConstraintsFilter(team, room, roomUsage, floorUsage, sectorExclusions) }));
    const candidates = checks.filter((c) => c.check.ok);

    if (candidates.length === 0) {
      const { reason, cause } = explainNoCandidate(team, rooms, roomUsage, floorUsage, sectorExclusions);
      exceptions.push({
        teamId: team.id,
        teamName: team.name,
        sectorId: team.sectorId,
        reason,
        cause,
        suggestion: suggestionFor(reason, team, rooms),
      });
      continue;
    }

    const proximityFloors = team.proximityGroupId ? (proximityFloorsByGroup.get(team.proximityGroupId) ?? []) : [];
    const scored = candidates.map((c) => ({ room: c.room, breakdown: scoreCandidate(team, c.room, proximityFloors) }));
    scored.sort((a, b) => b.breakdown.total - a.breakdown.total);
    const chosen = scored[0];

    assignments.set(team.id, { room: chosen.room, breakdown: chosen.breakdown, alternativesEvaluated: scored.length });

    const usageEntry: RoomUsage = { team, schedule: team.schedule };
    roomUsage.set(chosen.room.id, [...(roomUsage.get(chosen.room.id) ?? []), usageEntry]);
    floorUsage.set(chosen.room.floor, [...(floorUsage.get(chosen.room.floor) ?? []), usageEntry]);
    if (team.proximityGroupId) {
      proximityFloorsByGroup.set(team.proximityGroupId, [...(proximityFloorsByGroup.get(team.proximityGroupId) ?? []), chosen.room.floor]);
    }
  }

  improveWithSwaps(assignments, teams, sectorExclusions);

  const allocations: AllocationEntry[] = [];
  for (const team of teams) {
    const assignment = assignments.get(team.id);
    if (!assignment) continue;
    const occupancy = Math.round((team.size / assignment.room.capacity) * 1000) / 1000;
    allocations.push({
      teamId: team.id,
      roomId: assignment.room.id,
      occupancy,
      scoreBreakdown: assignment.breakdown,
      alternativesEvaluated: assignment.alternativesEvaluated,
      constraintsSatisfied: {
        accessibility: !team.requiresAccessibility || assignment.room.accessibility,
        resources: team.requiredResources.every((r) => assignment.room.resources.includes(r)),
        floorPreference: team.floorPreference == null ? null : team.floorPreference === assignment.room.floor,
        reserved: !assignment.room.reservedForSectorId || assignment.room.reservedForSectorId === team.sectorId,
      },
      explanation: buildExplanation(team, assignment.room, assignment.breakdown, assignment.alternativesEvaluated),
    });
  }

  const softConstraintsUnmet = allocations.filter((a) => a.constraintsSatisfied.floorPreference === false).length;
  const avgOccupancy = allocations.length ? allocations.reduce((sum, a) => sum + a.occupancy, 0) / allocations.length : 0;

  return {
    allocations,
    exceptions,
    governance: {
      algorithmVersion: ALGORITHM_VERSION,
      durationMs: Date.now() - start,
      teamsAnalyzed: teams.length,
      roomsAnalyzed: rooms.length,
      teamsAllocated: allocations.length,
      teamsUnallocated: exceptions.length,
      softConstraintsUnmet,
      // Nenhum candidato que viole uma restrição rígida chega a ser escolhido (ver
      // hardConstraintsFilter) — por isso este valor é sempre 0. É um critério de
      // aceitação do sistema, não uma coincidência dos dados de teste.
      hardConstraintsViolated: 0,
      predictedOccupancyPct: Math.round(avgOccupancy * 1000) / 10,
    },
  };
}

// Alocação "ingênua" usada como baseline na tela de comparação: primeira sala
// disponível com capacidade suficiente, na ordem original das equipes, sem nenhuma
// otimização de ocupação/localização/proximidade. Representa a "situação inicial"
// (processo manual) para fins de comparação de indicadores.
export function runNaiveBaseline(input: AllocateInput): AllocateOutput {
  const start = Date.now();
  const { rooms, teams, sectorExclusions } = input;
  const roomUsage = new Map<string, RoomUsage[]>();
  const floorUsage = new Map<number, RoomUsage[]>();
  const assignments = new Map<string, Assignment>();
  const exceptions: AllocationException[] = [];

  for (const team of teams) {
    const checks = rooms.map((room) => ({ room, check: hardConstraintsFilter(team, room, roomUsage, floorUsage, sectorExclusions) }));
    const firstFit = checks.find((c) => c.check.ok);
    if (!firstFit) {
      const { reason, cause } = explainNoCandidate(team, rooms, roomUsage, floorUsage, sectorExclusions);
      exceptions.push({
        teamId: team.id,
        teamName: team.name,
        sectorId: team.sectorId,
        reason,
        cause,
        suggestion: suggestionFor(reason, team, rooms),
      });
      continue;
    }
    const breakdown = scoreCandidate(team, firstFit.room, []);
    assignments.set(team.id, { room: firstFit.room, breakdown, alternativesEvaluated: 1 });
    const usageEntry: RoomUsage = { team, schedule: team.schedule };
    roomUsage.set(firstFit.room.id, [...(roomUsage.get(firstFit.room.id) ?? []), usageEntry]);
    floorUsage.set(firstFit.room.floor, [...(floorUsage.get(firstFit.room.floor) ?? []), usageEntry]);
  }

  const allocations: AllocationEntry[] = [];
  for (const team of teams) {
    const assignment = assignments.get(team.id);
    if (!assignment) continue;
    const occupancy = Math.round((team.size / assignment.room.capacity) * 1000) / 1000;
    allocations.push({
      teamId: team.id,
      roomId: assignment.room.id,
      occupancy,
      scoreBreakdown: assignment.breakdown,
      alternativesEvaluated: 1,
      constraintsSatisfied: {
        accessibility: !team.requiresAccessibility || assignment.room.accessibility,
        resources: team.requiredResources.every((r) => assignment.room.resources.includes(r)),
        floorPreference: team.floorPreference == null ? null : team.floorPreference === assignment.room.floor,
        reserved: !assignment.room.reservedForSectorId || assignment.room.reservedForSectorId === team.sectorId,
      },
      explanation: "Alocação inicial (primeira sala compatível encontrada, sem otimização).",
    });
  }

  const softConstraintsUnmet = allocations.filter((a) => a.constraintsSatisfied.floorPreference === false).length;
  const avgOccupancy = allocations.length ? allocations.reduce((sum, a) => sum + a.occupancy, 0) / allocations.length : 0;

  return {
    allocations,
    exceptions,
    governance: {
      algorithmVersion: "baseline-first-fit",
      durationMs: Date.now() - start,
      teamsAnalyzed: teams.length,
      roomsAnalyzed: rooms.length,
      teamsAllocated: allocations.length,
      teamsUnallocated: exceptions.length,
      softConstraintsUnmet,
      hardConstraintsViolated: 0,
      predictedOccupancyPct: Math.round(avgOccupancy * 1000) / 10,
    },
  };
}
