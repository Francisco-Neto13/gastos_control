import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { Team } from "@/lib/types";

export async function GET() {
  return NextResponse.json(store.getTeams());
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Team>;
  if (!body.name || !body.sectorId || !body.size || !body.schedule) {
    return NextResponse.json({ error: "Campos obrigatórios: name, sectorId, size, schedule." }, { status: 400 });
  }
  const team: Team = {
    id: body.id || `t-${Date.now().toString(36)}`,
    sectorId: body.sectorId,
    name: body.name,
    size: body.size,
    schedule: body.schedule,
    requiredResources: body.requiredResources ?? [],
    requiresAccessibility: body.requiresAccessibility ?? false,
    floorPreference: body.floorPreference ?? null,
    priority: body.priority ?? 2,
    proximityGroupId: body.proximityGroupId ?? null,
  };
  store.addTeam(team);
  return NextResponse.json(team, { status: 201 });
}
