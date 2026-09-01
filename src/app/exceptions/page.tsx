"use client";

import { useEffect, useState } from "react";
import type { AllocationException } from "@/lib/types";

const REASON_LABEL: Record<string, string> = {
  sem_sala_com_capacidade: "Sem sala com capacidade suficiente",
  sem_sala_acessivel: "Sem sala acessível disponível",
  sem_sala_com_recursos: "Sem sala com os recursos exigidos",
  sala_reservada_indisponivel: "Sala compatível está reservada para outro setor",
  conflito_horario: "Conflito de horário",
  restricao_setor_exclusivo: "Restrição de coexistência entre setores",
};

export default function ExceptionsPage() {
  const [runId, setRunId] = useState<string | null>(null);
  const [exceptions, setExceptions] = useState<AllocationException[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/exceptions")
      .then((r) => r.json())
      .then((d) => {
        setRunId(d.runId);
        setExceptions(d.exceptions);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Exceções e alertas</h1>
        <p className="page-subtitle">
          Nem todo problema tem solução perfeita. O sistema não esconde equipes sem sala compatível nem força uma
          alocação inválida — cada exceção mostra a causa e um possível encaminhamento.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : exceptions.length === 0 ? (
        <div className="card">
          <p className="text-sm text-slate-500">
            {runId ? "Nenhuma exceção na última execução — todas as equipes foram alocadas." : "Nenhuma execução do motor foi realizada ainda."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {exceptions.map((ex) => (
            <div key={ex.teamId} className="card border-amber-200 bg-amber-50">
              <p className="text-sm font-semibold text-amber-900">
                ALERTA — {ex.teamName} — não foi encontrada uma sala compatível
              </p>
              <dl className="mt-2 grid grid-cols-1 gap-1 text-sm text-amber-900 sm:grid-cols-2">
                <div>
                  <dt className="font-medium">Equipe afetada</dt>
                  <dd>{ex.teamName}</dd>
                </div>
                <div>
                  <dt className="font-medium">Restrição não atendida</dt>
                  <dd>{REASON_LABEL[ex.reason] ?? ex.reason}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium">Causa</dt>
                  <dd>{ex.cause}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium">Encaminhamento sugerido</dt>
                  <dd>{ex.suggestion}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
