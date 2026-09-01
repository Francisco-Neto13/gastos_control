import { store } from "../store";
import type { AllocationRun } from "../types";
import { runAllocation } from "./allocate";

let runCounter = 0;

function nextRunId(): string {
  const existing = store.getRuns();
  runCounter = Math.max(runCounter, existing.length);
  runCounter += 1;
  return `#${100 + runCounter}`;
}

// Ponto único de entrada usado pela rota de API /api/allocate. Lê o estado atual do
// "banco de dados", executa o motor e grava um registro de governança para cada
// execução — mesmo que o Coordenador Geral acabe rejeitando o resultado depois.
export function generateAllocation(user: string): AllocationRun {
  try {
    const rooms = store.getRooms();
    const teams = store.getTeams();
    const sectorExclusions = store.getSectorExclusions();

    const result = runAllocation({ rooms, teams, sectorExclusions });

    const run: AllocationRun = {
      runId: nextRunId(),
      status: "pendente",
      allocations: result.allocations,
      exceptions: result.exceptions,
      governance: {
        runId: "",
        timestamp: new Date().toISOString(),
        user,
        ...result.governance,
      },
    };
    run.governance.runId = run.runId;

    store.addRun(run);
    return run;
  } catch (err) {
    store.recordError(err instanceof Error ? err.message : String(err), "generateAllocation");
    throw err;
  }
}
