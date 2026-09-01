import fs from "node:fs";
import path from "node:path";
import type {
  AllocationRun,
  GovernanceRecord,
  ManualIntervention,
  Room,
  Sector,
  SectorExclusion,
  Team,
} from "./types";
import { seedRooms, seedSectorExclusions, seedSectors, seedTeams } from "./seed-data";

// Persistência simples em arquivo JSON. Para um protótipo de uma semana isto é
// suficiente e evita dependências nativas (ex.: better-sqlite3) que exigiriam
// compilação e complicariam o pipeline de CI. Toda a lógica de domínio (motor de
// alocação) é independente da forma de persistência.

export interface EngineErrorLog {
  timestamp: string;
  message: string;
  context?: string;
}

interface Db {
  rooms: Room[];
  sectors: Sector[];
  teams: Team[];
  sectorExclusions: SectorExclusion[];
  runs: AllocationRun[];
  interventions: ManualIntervention[];
  errors: EngineErrorLog[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function seedDb(): Db {
  return {
    rooms: seedRooms(),
    sectors: seedSectors(),
    teams: seedTeams(),
    sectorExclusions: seedSectorExclusions(),
    runs: [],
    interventions: [],
    errors: [],
  };
}

function loadDb(): Db {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(raw) as Db;
    }
  } catch {
    // arquivo corrompido ou ilegível: recomeça a partir da seed
  }
  const seeded = seedDb();
  persist(seeded);
  return seeded;
}

function persist(db: Db) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch {
    // Ambiente somente-leitura (ex.: build serverless): mantém apenas em memória.
  }
}

// Em dev, o Next.js recarrega módulos a cada mudança de arquivo. Guardamos a
// instância em globalThis para não perder o estado (e não reprocessar a seed) entre
// recarregamentos.
const globalForDb = globalThis as unknown as { __espacosDb?: Db };
const db: Db = globalForDb.__espacosDb ?? loadDb();
globalForDb.__espacosDb = db;

function save() {
  persist(db);
}

export const store = {
  // Salas
  getRooms(): Room[] {
    return db.rooms;
  },
  addRoom(room: Room) {
    db.rooms.push(room);
    save();
  },
  updateRoom(id: string, patch: Partial<Room>) {
    const room = db.rooms.find((r) => r.id === id);
    if (!room) return null;
    Object.assign(room, patch);
    save();
    return room;
  },
  deleteRoom(id: string) {
    const before = db.rooms.length;
    db.rooms = db.rooms.filter((r) => r.id !== id);
    save();
    return db.rooms.length < before;
  },

  // Setores
  getSectors(): Sector[] {
    return db.sectors;
  },
  addSector(sector: Sector) {
    db.sectors.push(sector);
    save();
  },
  updateSector(id: string, patch: Partial<Sector>) {
    const sector = db.sectors.find((s) => s.id === id);
    if (!sector) return null;
    Object.assign(sector, patch);
    save();
    return sector;
  },

  // Equipes
  getTeams(): Team[] {
    return db.teams;
  },
  addTeam(team: Team) {
    db.teams.push(team);
    save();
  },
  updateTeam(id: string, patch: Partial<Team>) {
    const team = db.teams.find((t) => t.id === id);
    if (!team) return null;
    Object.assign(team, patch);
    save();
    return team;
  },
  deleteTeam(id: string) {
    const before = db.teams.length;
    db.teams = db.teams.filter((t) => t.id !== id);
    save();
    return db.teams.length < before;
  },

  // Restrições globais
  getSectorExclusions(): SectorExclusion[] {
    return db.sectorExclusions;
  },
  addSectorExclusion(exclusion: SectorExclusion) {
    db.sectorExclusions.push(exclusion);
    save();
  },
  removeSectorExclusion(id: string) {
    db.sectorExclusions = db.sectorExclusions.filter((e) => e.id !== id);
    save();
  },

  // Execuções do motor de alocação (governança)
  getRuns(): AllocationRun[] {
    return db.runs;
  },
  getRun(runId: string): AllocationRun | undefined {
    return db.runs.find((r) => r.runId === runId);
  },
  addRun(run: AllocationRun) {
    db.runs.push(run);
    save();
  },
  updateRunStatus(runId: string, status: AllocationRun["status"]) {
    const run = db.runs.find((r) => r.runId === runId);
    if (!run) return null;
    run.status = status;
    save();
    return run;
  },
  updateRunAllocation(runId: string, teamId: string, newRoomId: string | null) {
    const run = db.runs.find((r) => r.runId === runId);
    if (!run) return null;
    run.allocations = run.allocations.filter((a) => a.teamId !== teamId);
    if (newRoomId) {
      run.allocations.push({
        teamId,
        roomId: newRoomId,
        occupancy: 0,
        scoreBreakdown: { occupancy: 0, floorPreference: 0, resourceMatch: 0, proximity: 0, total: 0 },
        alternativesEvaluated: 0,
        constraintsSatisfied: { accessibility: true, resources: true, floorPreference: null, reserved: true },
        explanation: "Alocação definida manualmente pelo Coordenador Geral.",
      });
    }
    save();
    return run;
  },
  latestAcceptedOrLastRun(): AllocationRun | undefined {
    const accepted = [...db.runs].reverse().find((r) => r.status === "aceita" || r.status === "parcialmente_alterada");
    return accepted ?? db.runs[db.runs.length - 1];
  },

  // Intervenções manuais (governança / rastreabilidade)
  getInterventions(): ManualIntervention[] {
    return db.interventions;
  },
  addIntervention(intervention: ManualIntervention) {
    db.interventions.push(intervention);
    save();
  },

  // Observabilidade: erros do motor
  getErrors(): EngineErrorLog[] {
    return db.errors;
  },
  recordError(message: string, context?: string) {
    db.errors.push({ timestamp: new Date().toISOString(), message, context });
    save();
  },

  // Utilitário para os testes: reseta para o estado de seed em memória (não persiste).
  resetToSeedInMemory() {
    const seeded = seedDb();
    db.rooms = seeded.rooms;
    db.sectors = seeded.sectors;
    db.teams = seeded.teams;
    db.sectorExclusions = seeded.sectorExclusions;
    db.runs = [];
    db.interventions = [];
    db.errors = [];
  },
};

export type { GovernanceRecord };
