import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { Room } from "@/lib/types";

export async function GET() {
  return NextResponse.json(store.getRooms());
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Room>;
  if (!body.name || !body.floor || !body.capacity || !body.type) {
    return NextResponse.json({ error: "Campos obrigatórios: name, floor, capacity, type." }, { status: 400 });
  }
  const room: Room = {
    id: body.id || `S${body.floor}-${Date.now().toString(36)}`,
    name: body.name,
    floor: body.floor,
    capacity: body.capacity,
    type: body.type,
    resources: body.resources ?? [],
    accessibility: body.accessibility ?? false,
    available: body.available ?? true,
    reservedForSectorId: body.reservedForSectorId ?? null,
  };
  store.addRoom(room);
  return NextResponse.json(room, { status: 201 });
}
