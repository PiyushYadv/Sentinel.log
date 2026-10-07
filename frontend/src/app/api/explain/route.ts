import { proxyToBackend } from "@/lib/backend";

export async function POST(req: Request) {
  const body = await req.text();
  return proxyToBackend("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
