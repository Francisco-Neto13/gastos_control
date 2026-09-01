// Barra de progresso simples (sem dependência de biblioteca de gráficos) usada para
// representar percentuais de ocupação em cards/tabelas/mapas de andar.
export function Bar({ pct, tone = "brand" }: { pct: number; tone?: "brand" | "warn" | "bad" }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color =
    tone === "warn"
      ? "bg-gradient-to-r from-amber-400 to-amber-500"
      : tone === "bad"
        ? "bg-gradient-to-r from-red-400 to-red-500"
        : "bg-gradient-to-r from-brand-500 to-brand-700";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/70">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
