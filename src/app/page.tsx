"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { Bar } from "@/components/Bar";

interface FloorStat {
  floor: number;
  rooms: number;
  roomsOccupied: number;
  capacity: number;
  occupiedSeats: number;
  utilizationPct: number;
}

interface DashboardData {
  hasRun: boolean;
  runId: string | null;
  runStatus: string | null;
  buildingOccupationPct: number;
  usedRoomsOccupancyPct: number;
  totalCapacity: number;
  allocatedEmployees: number;
  totalEmployeesInTeams: number;
  teamsAllocated: number;
  teamsUnallocated: number;
  roomsAvailable: number;
  roomsOccupied: number;
  roomsTotal: number;
  constraintsViolated: number;
  softConstraintsUnmet: number;
  floors: FloorStat[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Carregando…</p>;
  if (!data) return <p className="text-sm text-red-600">Falha ao carregar o dashboard.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard Executivo — Coordenador Geral</h1>
          <p className="page-subtitle">
            {data.hasRun
              ? `Baseado na execução ${data.runId} (status: ${data.runStatus}).`
              : "Nenhuma alocação foi gerada ainda."}
          </p>
        </div>
        <Link href="/allocate" className="btn-primary">
          Gerar alocação otimizada
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Ocupação total do prédio"
          value={`${data.buildingOccupationPct}%`}
          sub="funcionários alocados ÷ capacidade de TODAS as salas do prédio"
          tone="good"
        />
        <StatCard
          label="Ocupação das salas usadas"
          value={`${data.usedRoomsOccupancyPct}%`}
          sub="média só das salas que o motor efetivamente escolheu"
          tone="good"
        />
        <StatCard label="Capacidade total" value={data.totalCapacity} sub="assentos no prédio" />
        <StatCard
          label="Capacidade disponível"
          value={data.totalCapacity - data.allocatedEmployees}
          sub="assentos livres no prédio (capacidade total − alocados)"
        />
        <StatCard label="Funcionários alocados" value={data.allocatedEmployees} sub={`de ${data.totalEmployeesInTeams} em equipes`} />
        <StatCard
          label="Equipes não alocadas"
          value={data.teamsUnallocated}
          tone={data.teamsUnallocated > 0 ? "warn" : "good"}
        />
        <StatCard label="Salas disponíveis" value={data.roomsAvailable} />
        <StatCard label="Salas ocupadas" value={`${data.roomsOccupied} / ${data.roomsTotal}`} />
        <StatCard
          label="Restrições obrigatórias violadas"
          value={data.constraintsViolated}
          tone={data.constraintsViolated > 0 ? "bad" : "good"}
        />
        <StatCard
          label="Preferências não atendidas"
          value={data.softConstraintsUnmet}
          tone={data.softConstraintsUnmet > 0 ? "warn" : "good"}
        />
      </div>

      <div className="card">
        <h2 className="section-title mb-3 block">Ocupação por andar (mapa simplificado do prédio)</h2>
        <div className="flex flex-col gap-3">
          {[...data.floors].reverse().map((f) => (
            <div key={f.floor} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-sm font-medium text-slate-600">{f.floor}º andar</span>
              <div className="flex-1">
                <Bar pct={f.utilizationPct} tone={f.utilizationPct > 95 ? "warn" : "brand"} />
              </div>
              <span className="w-16 shrink-0 text-right text-xs text-slate-500">{f.utilizationPct}%</span>
              <span className="w-32 shrink-0 text-right text-xs text-slate-400">
                {f.occupiedSeats}/{f.capacity} assentos
              </span>
              <span className="w-24 shrink-0 text-right text-xs text-slate-400">
                {f.roomsOccupied}/{f.rooms} salas
              </span>
            </div>
          ))}
        </div>
      </div>

      {data.teamsUnallocated > 0 && (
        <div className="card border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Existem <strong>{data.teamsUnallocated}</strong> equipe(s) sem sala compatível.{" "}
            <Link href="/exceptions" className="font-medium underline">
              Ver detalhes em Exceções
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
