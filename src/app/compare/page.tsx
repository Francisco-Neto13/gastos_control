"use client";

import { useEffect, useState } from "react";
import type { ComparisonIndicator } from "@/lib/types";

interface CompareData {
  indicators: ComparisonIndicator[];
}

export default function ComparePage() {
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/compare")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Situação inicial vs. situação otimizada</h1>
        <p className="text-sm text-slate-500">
          Compara a distribuição ingênua (primeira sala compatível, sem otimização) com a proposta do motor de alocação,
          usando os mesmos dados de salas e equipes cadastrados no momento.
        </p>
      </div>

      {loading || !data ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Antes (manual)</th>
                <th>Depois (otimizado)</th>
                <th>Variação</th>
              </tr>
            </thead>
            <tbody>
              {data.indicators.map((ind) => {
                const delta = ind.after - ind.before;
                const improved = ind.betterWhen === "higher" ? delta > 0 : delta < 0;
                const worsened = ind.betterWhen === "higher" ? delta < 0 : delta > 0;
                return (
                  <tr key={ind.label}>
                    <td className="font-medium">{ind.label}</td>
                    <td>
                      {ind.before}
                      {ind.unit === "%" ? "%" : ""}
                    </td>
                    <td>
                      {ind.after}
                      {ind.unit === "%" ? "%" : ""}
                    </td>
                    <td className={improved ? "text-emerald-600" : worsened ? "text-red-600" : "text-slate-500"}>
                      {delta > 0 ? "+" : ""}
                      {Math.round(delta * 100) / 100}
                      {ind.unit === "%" ? "%" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
