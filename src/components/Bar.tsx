// Barra de progresso simples (sem dependência de biblioteca de gráficos) usada para
// representar percentuais de ocupação em cards/tabelas/mapas de andar.
export function Bar({ pct, tone = "brand" }: { pct: number; tone?: "brand" | "warn" | "bad" }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = tone === "warn" ? "bg-amber-500" : tone === "bad" ? "bg-red-500" : "bg-brand-600";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
