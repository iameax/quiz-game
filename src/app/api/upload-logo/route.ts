import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "missing file" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "not an image" }, { status: 400 });
  }
  const ext = file.name.split(".").pop() || "png";
  const id = randomUUID();
  const dir = path.join(process.cwd(), "public", "uploads", "teams");
  await mkdir(dir, { recursive: true });
  const dest = path.join(dir, `${id}.${ext}`);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(dest, buf);
  return NextResponse.json({ url: `/uploads/teams/${id}.${ext}` });
}
