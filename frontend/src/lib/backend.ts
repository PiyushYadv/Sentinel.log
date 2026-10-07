import { NextResponse } from "next/server";

// Server-only: where the Next.js route handlers reach FastAPI
// (http://backend:8000 inside docker-compose).
export const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

// Forward a request to FastAPI and relay its JSON (including error details)
export async function proxyToBackend(path: string, init: RequestInit) {
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, init);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail =
        typeof data?.detail === "string"
          ? data.detail
          : `Backend responded with status ${response.status}`;
      return NextResponse.json({ error: detail }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error(`API Proxy Error (${path}):`, error);
    return NextResponse.json(
      { error: "Could not reach the ML backend. Is FastAPI running on port 8000?" },
      { status: 502 },
    );
  }
}
