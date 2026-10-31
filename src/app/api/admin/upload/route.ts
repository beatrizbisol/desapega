import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { adminError, requireAdmin } from "@/lib/admin-guard";
import { putMedia, r2Enabled } from "@/lib/media";
import { extensionForMime, uploadsDir } from "@/lib/uploads";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
    }
    const ext = extensionForMime(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Use JPG, PNG, WEBP ou GIF." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "A foto deve ter no máximo 8 MB." },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    if (r2Enabled()) {
      const url = await putMedia(`uploads/${filename}`, bytes, file.type);
      return NextResponse.json({ url }, { status: 201 });
    }

    const dir = uploadsDir();
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), bytes);

    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
  } catch (error) {
    return adminError(error, "Erro no upload.");
  }
}
