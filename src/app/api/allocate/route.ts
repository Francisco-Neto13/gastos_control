import { NextRequest, NextResponse } from "next/server";
import { generateAllocation } from "@/lib/engine/run";

// Executa o motor de alocação ("GERAR ALOCAÇÃO OTIMIZADA"). Cada chamada produz um
// novo registro de governança, independentemente do resultado ser aceito depois ou não.
export async function POST(req: NextRequest) {
  let user = "coordenador-geral";
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.user) user = body.user;
  } catch {
    // corpo vazio é aceitável
  }

  try {
    const run = generateAllocation(user);
    return NextResponse.json(run, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao gerar alocação.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
