import { NextResponse } from "next/server";
import { store } from "@/lib/store";

// Situações que o motor não conseguiu resolver na última execução (seção 11): a
// equipe afetada, a causa e um possível encaminhamento — nunca uma alocação inválida
// disfarçada de sucesso.
export async function GET() {
  const run = store.latestAcceptedOrLastRun();
  return NextResponse.json({
    runId: run?.runId ?? null,
    exceptions: run?.exceptions ?? [],
  });
}
