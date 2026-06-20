import { getAiDocsBlob } from "@/lib/devtools";

export const runtime = "nodejs";
export const dynamic = "force-static";

// GET /devtools/llms.txt — the dev tools docs as raw markdown, for AI coding
// assistants to fetch as context (the emerging llms.txt convention). Shares the
// same source as the rendered Wiki tab via getAiDocsBlob().
export async function GET() {
  const body = await getAiDocsBlob();
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
