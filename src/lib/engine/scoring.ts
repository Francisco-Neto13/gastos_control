import type { Room, Schedule, Team } from "../types";

// Funções puras de pontuação. Isoladas do restante do motor para que possam ser
// testadas unitariamente sem depender de estado/persistência.

export function schedulesOverlap(a: Schedule, b: Schedule): boolean {
  if (a === "integral" || b === "integral") return true;
  return a === b;
}

export interface ScoreBreakdown {
  occupancy: number;
  floorPreference: number;
  resourceMatch: number;
  proximity: number;
  total: number;
}

// Pesos da função de otimização (somam 100). Documentados aqui para rastreabilidade —
// qualquer mudança nestes pesos é uma mudança de versão do algoritmo (ver ALGORITHM_VERSION
// em allocate.ts).
export const WEIGHTS = {
  occupancy: 45,
  floorPreference: 20,
  resourceMatch: 15,
  proximity: 20,
};

// Pontua o quão bem a ocupação da sala aproveita a capacidade, penalizando tanto o
// estouro (impossível, é filtrado antes) quanto a ociosidade excessiva.
export function occupancyScore(teamSize: number, roomCapacity: number): number {
  const ratio = teamSize / roomCapacity;
  if (ratio > 1) return 0; // nunca deveria chegar aqui (filtro rígido já bloqueia)
  // Faixa ideal: 70%-100% de ocupação. Abaixo disso, penaliza proporcionalmente a
  // ociosidade (assentos vazios), que é exatamente o problema que o enunciado pede
  // para minimizar.
  if (ratio >= 0.7) return 100;
  return Math.round((ratio / 0.7) * 100);
}

export function floorPreferenceScore(team: Team, room: Room): number {
  if (team.floorPreference == null) return 60; // neutro: sem preferência declarada
  const distance = Math.abs(team.floorPreference - room.floor);
  if (distance === 0) return 100;
  return Math.max(0, 100 - distance * 20);
}

export function resourceMatchScore(team: Team, room: Room): number {
  if (team.requiredResources.length === 0) return 70; // neutro
  const met = team.requiredResources.every((r) => room.resources.includes(r));
  if (!met) return 0; // filtro rígido já deveria ter removido este candidato
  // bônus por recursos extras compatíveis com o tipo de equipe
  const extras = room.resources.filter((r) => !team.requiredResources.includes(r)).length;
  return Math.min(100, 80 + extras * 5);
}

// proximityFloors: andares onde já existem equipes do mesmo grupo de proximidade.
export function proximityScore(room: Room, proximityFloors: number[]): number {
  if (proximityFloors.length === 0) return 50; // neutro: primeira equipe do grupo
  const minDistance = Math.min(...proximityFloors.map((f) => Math.abs(f - room.floor)));
  if (minDistance === 0) return 100;
  if (minDistance === 1) return 60;
  return 20;
}

export function scoreCandidate(
  team: Team,
  room: Room,
  proximityFloors: number[],
): ScoreBreakdown {
  const occupancy = occupancyScore(team.size, room.capacity);
  const floorPreference = floorPreferenceScore(team, room);
  const resourceMatch = resourceMatchScore(team, room);
  const proximity = proximityScore(room, proximityFloors);
  const total =
    (occupancy * WEIGHTS.occupancy +
      floorPreference * WEIGHTS.floorPreference +
      resourceMatch * WEIGHTS.resourceMatch +
      proximity * WEIGHTS.proximity) /
    100;
  return { occupancy, floorPreference, resourceMatch, proximity, total: Math.round(total * 100) / 100 };
}
