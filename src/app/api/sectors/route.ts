import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { Sector } from "@/lib/types";

export async function GET() {
  return NextResponse.json(store.getSectors());
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Sector>;
  if (!body.name || !body.coordinator) {
    return NextResponse.json({ error: "Campos obrigatórios: name, coordinator." }, { status: 400 });
  }
  const sector: Sector = {
    id: body.id || body.name.toLowerCase().replace(/\s+/g, "_"),
    name: body.name,
    coordinator: body.coordinator,
    totalEmployees: body.totalEmployees ?? 0,
  };
  store.addSector(sector);
  return NextResponse.json(sector, { status: 201 });
}
