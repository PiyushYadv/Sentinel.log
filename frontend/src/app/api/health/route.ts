import { proxyToBackend } from "@/lib/backend";

// Also used as a wake-up ping: free-tier backends sleep when idle
export async function GET() {
  return proxyToBackend("/api/health", { method: "GET", cache: "no-store" });
}
