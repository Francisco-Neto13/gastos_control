import { NextResponse } from "next/server";
import { store } from "@/lib/store";

// Histórico de auditoria (seção 12): para cada execução, quem rodou, quando, com
// quais dados, qual versão do algoritmo e qual foi o resultado — além das
// intervenções manuais registradas sobre cada execução.
export async function GET() {
  const runs = [...store.getRuns()].reverse();
  const interventions = store.getInterventions();

  const records = runs.map((run) => ({
    ...run.governance,
    status: run.status,
    interventions: interventions.filter((i) => i.runId === run.runId),
  }));

  return NextResponse.json(records);
}
