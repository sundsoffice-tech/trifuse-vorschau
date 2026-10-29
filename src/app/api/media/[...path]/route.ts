import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/modules/media/storage";

const types: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const rel = parts.join("/");
  if (parts.some((p) => p === ".." || p.includes("\\"))) return new Response("Nicht gefunden", { status: 404 });
  const base = uploadDir();
  const full = path.resolve(base, rel);
  if (!full.startsWith(base + path.sep)) return new Response("Nicht gefunden", { status: 404 });
  try {
    const info = await stat(full);
    if (!info.isFile()) throw new Error();
    const ext = path.extname(full).slice(1).toLowerCase();
    const body = await readFile(full);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": types[ext] ?? "application/octet-stream",
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Nicht gefunden", { status: 404 });
  }
}
