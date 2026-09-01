"use client";

import { useEffect, useState } from "react";
import type { GovernanceRecord, ManualIntervention } from "@/lib/types";

type GovernanceRow = GovernanceRecord & { status: string; interventions: ManualIntervention[] };

export default function GovernancePage() {
  const [rows, setRows] = useState<GovernanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/governance")
      .then((r) => r.json())
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Governança e auditoria</h1>
        <p className="text-sm text-slate-500">
          Toda execução do motor de alocação fica registrada: quem executou, quando, com quais dados, qual versão do
          algoritmo e qual foi o resultado — inclusive as intervenções manuais feitas depois.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : rows.length === 0 ? (
        <div className="card">
          <p className="text-sm text-slate-500">Nenhuma execução registrada ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <div key={row.runId} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-800">
                  Execução {row.runId} — {new Date(row.timestamp).toLocaleString("pt-BR")}
                </h2>
                <span className="badge bg-slate-100 text-slate-600">{row.status}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                <span>Usuário: {row.user}</span>
                <span>Algoritmo: {row.algorithmVersion}</span>
                <span>Duração: {row.durationMs} ms</span>
                <span>Ocupação prevista: {row.predictedOccupancyPct}%</span>
                <span>Equipes analisadas: {row.teamsAnalyzed}</span>
                <span>Salas analisadas: {row.roomsAnalyzed}</span>
                <span>Equipes alocadas: {row.teamsAllocated}</span>
                <span>Equipes não alocadas: {row.teamsUnallocated}</span>
                <span>Restrições obrigatórias violadas: {row.hardConstraintsViolated}</span>
                <span>Preferências não atendidas: {row.softConstraintsUnmet}</span>
              </div>
              {row.interventions.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-2">
                  <p className="mb-1 text-xs font-semibold text-slate-500">Intervenções humanas registradas</p>
                  <ul className="flex flex-col gap-1 text-xs text-slate-600">
                    {row.interventions.map((i) => (
                      <li key={i.id}>
                        {new Date(i.timestamp).toLocaleString("pt-BR")} · {i.user} · {i.action}
                        {i.teamId !== "ALL" ? ` · equipe ${i.teamId}` : ""}
                        {i.previousRoomId || i.newRoomId ? ` · ${i.previousRoomId ?? "—"} → ${i.newRoomId ?? "—"}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
