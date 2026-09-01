import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = store.getRun(decodeURIComponent(runId));
  if (!run) return NextResponse.json({ error: "Execução não encontrada." }, { status: 404 });
  return NextResponse.json(run);
}
