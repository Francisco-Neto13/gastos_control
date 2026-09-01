import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { Room } from "@/lib/types";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patch = (await req.json()) as Partial<Room>;
  const updated = store.updateRoom(id, patch);
  if (!updated) return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = store.deleteRoom(id);
  if (!ok) return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
