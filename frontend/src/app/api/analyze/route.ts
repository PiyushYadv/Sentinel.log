import { proxyToBackend } from "@/lib/backend";

export async function POST(req: Request) {
  // Forward the multipart upload as-is to the internal FastAPI backend
  const formData = await req.formData();
  return proxyToBackend("/api/analyze", { method: "POST", body: formData });
}
