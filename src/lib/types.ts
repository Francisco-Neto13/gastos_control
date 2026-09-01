// Modelo de domínio do Sistema Inteligente de Gestão e Otimização de Espaços Corporativos.
// Mantido em um único arquivo por ser pequeno e ser a "fonte da verdade" consultada por
// engine, rotas de API e UI.

export type RoomType =
  | "reuniao" // sala de reunião
  | "treinamento"
  | "auditorio"
  | "laboratorio"
  | "projeto"
  | "colaborativo";

export type Resource =
  | "projetor"
  | "videoconferencia"
  | "quadro_branco"
  | "computadores"
  | "som"
  | "bancada_lab";

export type Priority = 1 | 2 | 3; // 1 = alta, 2 = média, 3 = baixa

export interface Room {
  id: string;
  name: string;
  floor: number; // 1 a 9
  capacity: number;
  type: RoomType;
  resources: Resource[];
  accessibility: boolean;
  available: boolean; // sala pode estar em manutenção / indisponível
  reservedForSectorId?: string | null; // sala reservada para um setor específico
}

export interface Sector {
  id: string;
  name: string;
  coordinator: string;
  totalEmployees: number;
}

export type Schedule = "manha" | "tarde" | "integral";

export interface Team {
  id: string;
  sectorId: string;
  name: string;
  size: number;
  schedule: Schedule;
  requiredResources: Resource[];
  requiresAccessibility: boolean;
  floorPreference?: number | null;
  priority: Priority;
  proximityGroupId?: string | null; // equipes com o mesmo id devem ficar próximas
}

// Restrição global de "não podem compartilhar área" entre dois setores.
export interface SectorExclusion {
  id: string;
  sectorAId: string;
  sectorBId: string;
  reason: string;
}

export interface AllocationEntry {
  teamId: string;
  roomId: string;
  occupancy: number; // 0..1
  scoreBreakdown: {
    occupancy: number;
    floorPreference: number;
    resourceMatch: number;
    proximity: number;
    total: number;
  };
  alternativesEvaluated: number;
  constraintsSatisfied: {
    accessibility: boolean;
    resources: boolean;
    floorPreference: boolean | null; // null = equipe não tinha preferência
    reserved: boolean;
  };
  explanation: string;
}

export type ExceptionReason =
  | "sem_sala_com_capacidade"
  | "sem_sala_acessivel"
  | "sem_sala_com_recursos"
  | "sala_reservada_indisponivel"
  | "conflito_horario"
  | "restricao_setor_exclusivo";

export interface AllocationException {
  teamId: string;
  teamName: string;
  sectorId: string;
  reason: ExceptionReason;
  cause: string;
  suggestion: string;
}

export interface ManualIntervention {
  id: string;
  runId: string;
  teamId: string;
  action: "aceitar" | "rejeitar" | "alterar_manual";
  previousRoomId: string | null;
  newRoomId: string | null;
  user: string;
  timestamp: string;
  note?: string;
}

export interface GovernanceRecord {
  runId: string;
  timestamp: string;
  user: string;
  algorithmVersion: string;
  durationMs: number;
  teamsAnalyzed: number;
  roomsAnalyzed: number;
  teamsAllocated: number;
  teamsUnallocated: number;
  softConstraintsUnmet: number; // ex: preferência de andar não atendida
  hardConstraintsViolated: number; // deve ser sempre 0 (critério de aceitação)
  predictedOccupancyPct: number;
}

export interface AllocationRun {
  runId: string;
  governance: GovernanceRecord;
  allocations: AllocationEntry[];
  exceptions: AllocationException[];
  status: "pendente" | "aceita" | "rejeitada" | "parcialmente_alterada";
}

export interface ComparisonIndicator {
  label: string;
  before: number;
  after: number;
  unit: "%" | "un";
  betterWhen: "higher" | "lower";
}
