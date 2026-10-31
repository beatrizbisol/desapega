import { promises as fs } from "fs";
import path from "path";
import { UPLOAD_NAME, UPLOAD_TYPES, uploadsDir } from "@/lib/uploads";

type Params = { params: Promise<{ file: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { file } = await params;
  const match = UPLOAD_NAME.exec(file);
  if (!match) return new Response(null, { status: 404 });

  try {
    const bytes = await fs.readFile(path.join(uploadsDir(), file));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": UPLOAD_TYPES[match[1]],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
