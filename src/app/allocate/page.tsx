"use client";

import { useEffect, useState } from "react";
import type { AllocationRun, Room, Team } from "@/lib/types";

export default function AllocatePage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [run, setRun] = useState<AllocationRun | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [overrideRoomId, setOverrideRoomId] = useState<string>("");

  useEffect(() => {
    fetch("/api/rooms").then((r) => r.json()).then(setRooms);
    fetch("/api/teams").then((r) => r.json()).then(setTeams);
  }, []);

  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  async function handleGenerate() {
    setRunning(true);
    setSelectedTeamId(null);
    try {
      const res = await fetch("/api/allocate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: "coordenador-geral" }) });
      const data = await res.json();
      setRun(data);
    } finally {
      setRunning(false);
    }
  }

  async function decide(action: "aceitar" | "rejeitar") {
    if (!run) return;
    const res = await fetch(`/api/allocations/${encodeURIComponent(run.runId)}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, user: "coordenador-geral" }),
    });
    const data = await res.json();
    setRun(data.run);
  }

  async function applyOverride(teamId: string) {
    if (!run || !overrideRoomId) return;
    const res = await fetch(`/api/allocations/${encodeURIComponent(run.runId)}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "alterar_manual", teamId, newRoomId: overrideRoomId, user: "coordenador-geral", note: "Ajuste manual pelo Coordenador Geral." }),
    });
    const data = await res.json();
    setRun(data.run);
    setOverrideRoomId("");
  }

  const selectedAllocation = run?.allocations.find((a) => a.teamId === selectedTeamId);
  const selectedTeam = selectedTeamId ? teamById.get(selectedTeamId) : undefined;
  const selectedRoom = selectedAllocation ? roomById.get(selectedAllocation.roomId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gerar Alocação Otimizada</h1>
          <p className="text-sm text-slate-500">
            Executa o motor de alocação (allocation-engine-v1) sobre as salas e equipes cadastradas.
          </p>
        </div>
        <button onClick={handleGenerate} disabled={running} className="btn-primary">
          {running ? "Otimizando…" : "GERAR ALOCAÇÃO OTIMIZADA"}
        </button>
      </div>

      {run && (
        <>
          <div className="card flex flex-wrap items-center gap-4 text-sm">
            <span>
              Execução <strong>{run.runId}</strong> · status: <strong>{run.status}</strong>
            </span>
            <span>Tempo: {run.governance.durationMs} ms</span>
            <span>Equipes alocadas: {run.governance.teamsAllocated}</span>
            <span>Não alocadas: {run.governance.teamsUnallocated}</span>
            <span>Ocupação prevista: {run.governance.predictedOccupancyPct}%</span>
            <div className="ml-auto flex gap-2">
              <button className="btn-secondary" onClick={() => decide("aceitar")} disabled={run.status === "aceita"}>
                Aceitar recomendação
              </button>
              <button className="btn-danger" onClick={() => decide("rejeitar")} disabled={run.status === "rejeitada"}>
                Rejeitar
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Distribuição proposta</h2>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Equipe</th>
                    <th>Pessoas</th>
                    <th>Sala sugerida</th>
                    <th>Capacidade</th>
                    <th>Andar</th>
                    <th>Ocupação</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {run.allocations.map((a) => {
                    const team = teamById.get(a.teamId);
                    const room = roomById.get(a.roomId);
                    if (!team || !room) return null;
                    return (
                      <tr key={a.teamId} className={selectedTeamId === a.teamId ? "bg-brand-50" : ""}>
                        <td className="font-medium">{team.name}</td>
                        <td>{team.size}</td>
                        <td>{room.name}</td>
                        <td>{room.capacity}</td>
                        <td>{room.floor}º</td>
                        <td>{Math.round(a.occupancy * 100)}%</td>
                        <td>
                          <button className="btn-secondary" onClick={() => setSelectedTeamId(a.teamId)}>
                            Ver justificativa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {selectedTeam && selectedRoom && selectedAllocation && (
            <div className="card border-brand-200 bg-brand-50">
              <h2 className="mb-2 text-sm font-semibold text-brand-800">
                Justificativa — {selectedTeam.name} → {selectedRoom.name}
              </h2>
              <p className="whitespace-pre-line text-sm text-slate-700">{selectedAllocation.explanation}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                <span>Score ocupação: {selectedAllocation.scoreBreakdown.occupancy}</span>
                <span>Score localização: {selectedAllocation.scoreBreakdown.floorPreference}</span>
                <span>Score recursos: {selectedAllocation.scoreBreakdown.resourceMatch}</span>
                <span>Score proximidade: {selectedAllocation.scoreBreakdown.proximity}</span>
              </div>
              <div className="mt-4 flex items-end gap-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Alterar manualmente para outra sala
                  <select
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={overrideRoomId}
                    onChange={(e) => setOverrideRoomId(e.target.value)}
                  >
                    <option value="">Selecione uma sala…</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (cap. {r.capacity}, {r.floor}º andar)
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn-primary" onClick={() => applyOverride(selectedTeam.id)} disabled={!overrideRoomId}>
                  Aplicar alteração manual
                </button>
              </div>
            </div>
          )}

          {run.exceptions.length > 0 && (
            <div className="card border-amber-200 bg-amber-50">
              <h2 className="mb-2 text-sm font-semibold text-amber-800">
                ALERTA — {run.exceptions.length} equipe(s) sem alocação compatível
              </h2>
              <ul className="flex flex-col gap-2 text-sm text-amber-900">
                {run.exceptions.map((ex) => (
                  <li key={ex.teamId}>
                    <strong>{ex.teamName}</strong>: {ex.cause} <br />
                    <span className="text-xs">Encaminhamento sugerido: {ex.suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
