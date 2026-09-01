"use client";

import { useEffect, useState } from "react";
import type { Priority, Resource, Schedule, Sector, SectorExclusion, Team } from "@/lib/types";

const RESOURCES: Resource[] = ["projetor", "videoconferencia", "quadro_branco", "computadores", "som", "bancada_lab"];
const SCHEDULES: Schedule[] = ["manha", "tarde", "integral"];

function emptyTeamForm(sectorId: string) {
  return {
    sectorId,
    name: "",
    size: 10,
    schedule: "integral" as Schedule,
    requiredResources: [] as Resource[],
    requiresAccessibility: false,
    floorPreference: "" as string | number,
    priority: 2 as Priority,
    proximityGroupId: "",
  };
}

export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [exclusions, setExclusions] = useState<SectorExclusion[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>("");
  const [form, setForm] = useState(emptyTeamForm(""));
  const [exclusionForm, setExclusionForm] = useState({ sectorAId: "", sectorBId: "", reason: "" });

  function load() {
    Promise.all([
      fetch("/api/sectors").then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
      fetch("/api/constraints").then((r) => r.json()),
    ]).then(([s, t, e]) => {
      setSectors(s);
      setTeams(t);
      setExclusions(e);
      if (!selectedSector && s.length) setSelectedSector(s[0].id);
    });
  }

  useEffect(load, []);

  useEffect(() => {
    setForm(emptyTeamForm(selectedSector));
  }, [selectedSector]);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        floorPreference: form.floorPreference === "" ? null : Number(form.floorPreference),
        proximityGroupId: form.proximityGroupId || null,
      }),
    });
    setForm(emptyTeamForm(selectedSector));
    load();
  }

  async function updateTeam(id: string, patch: Partial<Team>) {
    await fetch(`/api/teams/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    load();
  }

  async function deleteTeam(id: string) {
    await fetch(`/api/teams/${id}`, { method: "DELETE" });
    load();
  }

  async function handleCreateExclusion(e: React.FormEvent) {
    e.preventDefault();
    if (!exclusionForm.sectorAId || !exclusionForm.sectorBId || exclusionForm.sectorAId === exclusionForm.sectorBId) return;
    await fetch("/api/constraints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(exclusionForm) });
    setExclusionForm({ sectorAId: "", sectorBId: "", reason: "" });
    load();
  }

  async function removeExclusion(id: string) {
    await fetch(`/api/constraints/${id}`, { method: "DELETE" });
    load();
  }

  const sectorTeams = teams.filter((t) => t.sectorId === selectedSector);
  const sectorMap = new Map(sectors.map((s) => [s.id, s.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Setores e Equipes</h1>
        <p className="page-subtitle">
          Cada Coordenador de Setor informa a quantidade de funcionários, equipes, horários e restrições que o motor de
          alocação usará para sugerir a melhor distribuição.
        </p>
      </div>

      <div className="card">
        <div className="mb-3 flex flex-wrap gap-2">
          {sectors.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSector(s.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                selectedSector === s.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        {sectors.find((s) => s.id === selectedSector) && (
          <p className="text-xs text-slate-500">
            Coordenador: {sectors.find((s) => s.id === selectedSector)?.coordinator} · Funcionários no setor:{" "}
            {sectors.find((s) => s.id === selectedSector)?.totalEmployees}
          </p>
        )}
      </div>

      <form onSubmit={handleCreateTeam} className="card grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Nome da equipe
          <input
            required
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Nº de funcionários
          <input
            type="number"
            min={1}
            required
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={form.size}
            onChange={(e) => setForm({ ...form, size: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Horário
          <select
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={form.schedule}
            onChange={(e) => setForm({ ...form, schedule: e.target.value as Schedule })}
          >
            {SCHEDULES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Prioridade
          <select
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) as Priority })}
          >
            <option value={1}>1 — alta</option>
            <option value={2}>2 — média</option>
            <option value={3}>3 — baixa</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Preferência de andar
          <input
            type="number"
            min={1}
            max={9}
            placeholder="opcional"
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={form.floorPreference}
            onChange={(e) => setForm({ ...form, floorPreference: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Grupo de proximidade
          <input
            placeholder="opcional"
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={form.proximityGroupId}
            onChange={(e) => setForm({ ...form, proximityGroupId: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={form.requiresAccessibility}
            onChange={(e) => setForm({ ...form, requiresAccessibility: e.target.checked })}
          />
          Requer acessibilidade
        </label>
        <div className="col-span-2 flex flex-col gap-1 text-xs font-medium text-slate-600 md:col-span-2">
          Equipamentos necessários
          <div className="flex flex-wrap gap-2">
            {RESOURCES.map((r) => (
              <label key={r} className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={form.requiredResources.includes(r)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requiredResources: e.target.checked
                        ? [...form.requiredResources, r]
                        : form.requiredResources.filter((x) => x !== r),
                    })
                  }
                />
                {r}
              </label>
            ))}
          </div>
        </div>
        <div className="col-span-2 flex items-end md:col-span-4">
          <button type="submit" className="btn-primary">
            Adicionar equipe ao setor
          </button>
        </div>
      </form>

      <div className="card">
        <h2 className="section-title mb-3 block">Equipes do setor selecionado</h2>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Equipe</th>
                <th>Pessoas</th>
                <th>Horário</th>
                <th>Prioridade</th>
                <th>Andar pref.</th>
                <th>Acessibilidade</th>
                <th>Recursos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sectorTeams.map((team) => (
                <tr key={team.id}>
                  <td className="font-medium">{team.name}</td>
                  <td>
                    <input
                      type="number"
                      className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      defaultValue={team.size}
                      onBlur={(e) => updateTeam(team.id, { size: Number(e.target.value) })}
                    />
                  </td>
                  <td>{team.schedule}</td>
                  <td>{team.priority}</td>
                  <td>{team.floorPreference ?? "—"}</td>
                  <td>{team.requiresAccessibility ? "Sim" : "Não"}</td>
                  <td className="text-xs text-slate-500">{team.requiredResources.join(", ") || "—"}</td>
                  <td>
                    <button className="btn-danger" onClick={() => deleteTeam(team.id)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {sectorTeams.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-slate-400">
                    Nenhuma equipe cadastrada para este setor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title mb-3 block">
          Restrições de coexistência entre setores (definidas pelo Coordenador Geral)
        </h2>
        <form onSubmit={handleCreateExclusion} className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <select
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={exclusionForm.sectorAId}
            onChange={(e) => setExclusionForm({ ...exclusionForm, sectorAId: e.target.value })}
          >
            <option value="">Setor A</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={exclusionForm.sectorBId}
            onChange={(e) => setExclusionForm({ ...exclusionForm, sectorBId: e.target.value })}
          >
            <option value="">Setor B</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Motivo"
            className="rounded-md border border-slate-300 px-2 py-1 text-sm md:col-span-1"
            value={exclusionForm.reason}
            onChange={(e) => setExclusionForm({ ...exclusionForm, reason: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Adicionar restrição
          </button>
        </form>
        <ul className="flex flex-col gap-2 text-sm">
          {exclusions.map((ex) => (
            <li key={ex.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
              <span>
                <strong>{sectorMap.get(ex.sectorAId) ?? ex.sectorAId}</strong> não pode compartilhar andar/horário com{" "}
                <strong>{sectorMap.get(ex.sectorBId) ?? ex.sectorBId}</strong> — {ex.reason}
              </span>
              <button className="btn-danger" onClick={() => removeExclusion(ex.id)}>
                Remover
              </button>
            </li>
          ))}
          {exclusions.length === 0 && <li className="text-slate-400">Nenhuma restrição de coexistência definida.</li>}
        </ul>
      </div>
    </div>
  );
}
