import { readFile } from "node:fs/promises";
import path from "node:path";

// The landing page is served byte-for-byte from apps/web/app/landing.html.
// It is a self-contained HTML/CSS/JS document (from reference-landing.html) —
// layout, styling and animation are intentionally untouched.
export async function GET() {
  const filePath = path.join(process.cwd(), "app", "landing.html");
  const html = await readFile(filePath, "utf-8");
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
