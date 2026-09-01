"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";

interface Observability {
  totalRuns: number;
  lastRunDurationMs: number | null;
  avgOccupancyPct: number | null;
  allocationRatePct: number | null;
  totalViolations: number;
  lastRunUnallocatedTeams: number | null;
  manualInterventions: number;
  errors: number;
  recentErrors: { timestamp: string; message: string; context?: string }[];
}

export default function MonitoringPage() {
  const [data, setData] = useState<Observability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/observability")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Monitoramento do Motor de Alocação</h1>
        <p className="page-subtitle">
          Indicadores agregados de todas as execuções já realizadas, para acompanhar se o mecanismo de recomendação
          continua funcionando corretamente em produção.
        </p>
      </div>

      {loading || !data ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatCard label="Execuções realizadas" value={data.totalRuns} />
          <StatCard label="Tempo da última otimização" value={data.lastRunDurationMs != null ? `${(data.lastRunDurationMs / 1000).toFixed(2)} s` : "—"} />
          <StatCard label="Taxa média de alocação" value={data.allocationRatePct != null ? `${data.allocationRatePct}%` : "—"} tone="good" />
          <StatCard
            label="Ocupação média das salas usadas"
            value={data.avgOccupancyPct != null ? `${data.avgOccupancyPct}%` : "—"}
            sub="média histórica só das salas escolhidas em cada execução — não é a ocupação do prédio inteiro (ver Dashboard)"
          />
          <StatCard label="Violações de restrição obrigatória" value={data.totalViolations} tone={data.totalViolations > 0 ? "bad" : "good"} />
          <StatCard
            label="Equipes não alocadas (última execução)"
            value={data.lastRunUnallocatedTeams ?? "—"}
            tone={data.lastRunUnallocatedTeams ? "warn" : "good"}
          />
          <StatCard label="Intervenções manuais" value={data.manualInterventions} />
          <StatCard label="Erros do motor" value={data.errors} tone={data.errors > 0 ? "bad" : "good"} />
        </div>
      )}

      {data && data.recentErrors.length > 0 && (
        <div className="card border-red-200 bg-red-50">
          <h2 className="mb-2 text-sm font-semibold text-red-800">Erros recentes</h2>
          <ul className="flex flex-col gap-1 text-xs text-red-700">
            {data.recentErrors.map((e, i) => (
              <li key={i}>
                {new Date(e.timestamp).toLocaleString("pt-BR")} — {e.context ? `[${e.context}] ` : ""}
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
