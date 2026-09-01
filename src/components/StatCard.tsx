export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-red-600"
          : "text-ink-900";

  // Faixa lateral colorida indica o tom do indicador sem depender so da cor do numero.
  const accent =
    tone === "good"
      ? "before:bg-emerald-400"
      : tone === "warn"
        ? "before:bg-amber-400"
        : tone === "bad"
          ? "before:bg-red-400"
          : "before:bg-brand-400";

  return (
    <div
      className={`card relative flex flex-col gap-1.5 overflow-hidden pl-6 transition-shadow hover:shadow-pop before:absolute before:inset-y-0 before:left-0 before:w-1.5 ${accent}`}
    >
      <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`font-display text-3xl font-bold leading-none ${toneClass}`}>{value}</span>
      {sub && <span className="text-xs leading-relaxed text-slate-400">{sub}</span>}
    </div>
  );
}
