import { NextResponse } from "next/server";
import { packs } from "@/server/context";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = packs.find(p => p.id === id);
  if (!pack) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(pack);
}
