import { NextResponse } from "next/server";
import { store } from "@/lib/store";

// "Monitoramento do Motor de Alocação" (seção 13): indicadores agregados de todas as
// execuções já realizadas, para responder "o mecanismo continua funcionando bem em
// produção?" sem precisar reler cada execução individualmente.
export async function GET() {
  const runs = store.getRuns();
  const interventions = store.getInterventions();
  const errors = store.getErrors();

  if (runs.length === 0) {
    return NextResponse.json({
      totalRuns: 0,
      lastRunDurationMs: null,
      avgOccupancyPct: null,
      allocationRatePct: null,
      totalViolations: 0,
      lastRunUnallocatedTeams: null,
      manualInterventions: interventions.length,
      errors: errors.length,
      recentErrors: errors.slice(-5),
    });
  }

  const last = runs[runs.length - 1];
  const totalTeamsAnalyzed = runs.reduce((s, r) => s + r.governance.teamsAnalyzed, 0);
  const totalTeamsAllocated = runs.reduce((s, r) => s + r.governance.teamsAllocated, 0);
  const avgOccupancyPct =
    Math.round((runs.reduce((s, r) => s + r.governance.predictedOccupancyPct, 0) / runs.length) * 10) / 10;

  return NextResponse.json({
    totalRuns: runs.length,
    lastRunDurationMs: last.governance.durationMs,
    avgOccupancyPct,
    allocationRatePct: totalTeamsAnalyzed ? Math.round((totalTeamsAllocated / totalTeamsAnalyzed) * 1000) / 10 : 0,
    totalViolations: runs.reduce((s, r) => s + r.governance.hardConstraintsViolated, 0),
    // "Quantidade de equipes não alocadas" (seção 13 do enunciado) — da última
    // execução, já que é o número que importa para saber se o motor está
    // conseguindo resolver o cenário atual, e não um total acumulado sem sentido
    // entre execuções com conjuntos de equipes diferentes.
    lastRunUnallocatedTeams: last.governance.teamsUnallocated,
    manualInterventions: interventions.length,
    errors: errors.length,
    recentErrors: errors.slice(-5),
  });
}
