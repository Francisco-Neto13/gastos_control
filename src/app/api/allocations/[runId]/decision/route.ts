import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { ManualIntervention } from "@/lib/types";

interface DecisionBody {
  action: "aceitar" | "rejeitar" | "alterar_manual";
  teamId?: string;
  newRoomId?: string | null;
  user?: string;
  note?: string;
}

// Registra a intervenção humana sobre uma recomendação do motor (seção 10 do
// enunciado: aceitar / rejeitar / alterar manualmente / solicitar nova otimização).
// A decisão final é sempre do Coordenador Geral — o sistema só registra e aplica.
export async function POST(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = store.getRun(decodeURIComponent(runId));
  if (!run) return NextResponse.json({ error: "Execução não encontrada." }, { status: 404 });

  const body = (await req.json()) as DecisionBody;
  const user = body.user ?? "coordenador-geral";

  if (body.action === "aceitar") {
    store.updateRunStatus(run.runId, "aceita");
  } else if (body.action === "rejeitar") {
    store.updateRunStatus(run.runId, "rejeitada");
  } else if (body.action === "alterar_manual") {
    if (!body.teamId) return NextResponse.json({ error: "teamId é obrigatório para alterar_manual." }, { status: 400 });
    const previous = run.allocations.find((a) => a.teamId === body.teamId)?.roomId ?? null;
    store.updateRunAllocation(run.runId, body.teamId, body.newRoomId ?? null);
    store.updateRunStatus(run.runId, "parcialmente_alterada");

    const intervention: ManualIntervention = {
      id: `int-${Date.now().toString(36)}`,
      runId: run.runId,
      teamId: body.teamId,
      action: "alterar_manual",
      previousRoomId: previous,
      newRoomId: body.newRoomId ?? null,
      user,
      timestamp: new Date().toISOString(),
      note: body.note,
    };
    store.addIntervention(intervention);
    return NextResponse.json({ ok: true, run: store.getRun(run.runId), intervention });
  } else {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  const intervention: ManualIntervention = {
    id: `int-${Date.now().toString(36)}`,
    runId: run.runId,
    teamId: body.teamId ?? "ALL",
    action: body.action,
    previousRoomId: null,
    newRoomId: null,
    user,
    timestamp: new Date().toISOString(),
    note: body.note,
  };
  store.addIntervention(intervention);

  return NextResponse.json({ ok: true, run: store.getRun(run.runId), intervention });
}
