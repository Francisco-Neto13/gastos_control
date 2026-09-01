"use client";

import { useEffect, useState } from "react";
import type { Resource, Room, RoomType } from "@/lib/types";

const ROOM_TYPES: RoomType[] = ["reuniao", "treinamento", "auditorio", "laboratorio", "projeto", "colaborativo"];
const RESOURCES: Resource[] = ["projetor", "videoconferencia", "quadro_branco", "computadores", "som", "bancada_lab"];

const emptyForm = {
  name: "",
  floor: 1,
  capacity: 10,
  type: "reuniao" as RoomType,
  resources: [] as Resource[],
  accessibility: false,
  available: true,
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/rooms")
      .then((r) => r.json())
      .then(setRooms)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm(emptyForm);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAvailable(room: Room) {
    await fetch(`/api/rooms/${room.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !room.available }),
    });
    load();
  }

  async function removeRoom(room: Room) {
    if (!window.confirm(`Remover a ${room.name} definitivamente? Isso não pode ser desfeito.`)) return;
    await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    load();
  }

  const byFloor = new Map<number, Room[]>();
  for (const room of rooms) {
    byFloor.set(room.floor, [...(byFloor.get(room.floor) ?? []), room]);
  }
  const floors = [...byFloor.keys()].sort((a, b) => b - a);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Salas do prédio</h1>
        <p className="page-subtitle">
          Cadastro do Coordenador Geral: capacidade, andar, tipo, recursos, acessibilidade e disponibilidade de cada sala.
        </p>
      </div>

      <form onSubmit={handleCreate} className="card grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Nome
          <input
            required
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Andar
          <input
            type="number"
            min={1}
            max={9}
            required
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={form.floor}
            onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Capacidade
          <input
            type="number"
            min={1}
            required
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Tipo
          <select
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as RoomType })}
          >
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="col-span-2 flex flex-col gap-1 text-xs font-medium text-slate-600 md:col-span-2">
          Recursos
          <div className="flex flex-wrap gap-2">
            {RESOURCES.map((r) => (
              <label key={r} className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={form.resources.includes(r)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      resources: e.target.checked ? [...form.resources, r] : form.resources.filter((x) => x !== r),
                    })
                  }
                />
                {r}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={form.accessibility}
            onChange={(e) => setForm({ ...form, accessibility: e.target.checked })}
          />
          Acessível
        </label>
        <div className="col-span-2 flex items-end md:col-span-1">
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Salvando…" : "Cadastrar sala"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : (
        floors.map((floor) => (
          <div key={floor} className="card">
            <h2 className="section-title mb-3 block">{floor}º andar</h2>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Sala</th>
                    <th>Tipo</th>
                    <th>Capacidade</th>
                    <th>Recursos</th>
                    <th>Acessível</th>
                    <th>Reservada</th>
                    <th>Disponível</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {byFloor.get(floor)!.map((room) => (
                    <tr key={room.id}>
                      <td className="font-medium">{room.name}</td>
                      <td>{room.type}</td>
                      <td>{room.capacity}</td>
                      <td className="text-xs text-slate-500">{room.resources.join(", ") || "—"}</td>
                      <td>{room.accessibility ? "Sim" : "Não"}</td>
                      <td>{room.reservedForSectorId ?? "—"}</td>
                      <td>
                        <span className={`badge ${room.available ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                          {room.available ? "Disponível" : "Indisponível"}
                        </span>
                      </td>
                      <td className="flex gap-2">
                        <button className="btn-secondary" onClick={() => toggleAvailable(room)}>
                          {room.available ? "Bloquear" : "Liberar"}
                        </button>
                        <button className="btn-danger" onClick={() => removeRoom(room)}>
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
