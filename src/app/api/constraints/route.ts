import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { SectorExclusion } from "@/lib/types";

// Restrições globais de coexistência entre setores ("setores X e Y não podem
// compartilhar uma área/andar no mesmo horário"). Outras restrições (capacidade
// mínima, andar permitido, acessibilidade, equipamento, sala reservada, prioridade)
// já são atributos diretos de Sala/Equipe e são editadas em /rooms e /sectors.
export async function GET() {
  return NextResponse.json(store.getSectorExclusions());
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<SectorExclusion>;
  if (!body.sectorAId || !body.sectorBId) {
    return NextResponse.json({ error: "Campos obrigatórios: sectorAId, sectorBId." }, { status: 400 });
  }
  const exclusion: SectorExclusion = {
    id: body.id || `excl-${Date.now().toString(36)}`,
    sectorAId: body.sectorAId,
    sectorBId: body.sectorBId,
    reason: body.reason ?? "Restrição definida pelo Coordenador Geral.",
  };
  store.addSectorExclusion(exclusion);
  return NextResponse.json(exclusion, { status: 201 });
}
