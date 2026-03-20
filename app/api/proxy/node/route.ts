import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NODES } from "@/app/lib/types";
import { verifySession } from "@/app/lib/session";

const ALLOWED_IPS = new Set(NODES.map((n) => n.ip));

/**
 * Allowlist of node API paths that the panel is permitted to proxy.
 * Any path not in this set (or the exempt pattern) is rejected (C-3).
 */
const ALLOWED_PATHS = new Set([
  "/negotiate/propose",
  "/envelopes/send",
  "/admin/exempt",
  "/admin/stats",
  "/hosted/ping",
  "/hosted/register",
]);

/** Returns true for /admin/exempt/<64-char-hex-agent-id> (DELETE) */
function isAllowedPath(p: string): boolean {
  if (ALLOWED_PATHS.has(p)) return true;
  if (/^\/admin\/exempt\/[0-9a-f]{64}$/.test(p)) return true;
  return false;
}

/**
 * Verify the caller has a valid session cookie.
 * Returns false when SESSION_SECRET is not configured (open-access dev mode).
 */
async function hasSession(): Promise<boolean> {
  if (!process.env.SESSION_SECRET) {
    if (process.env.NODE_ENV === "production") {
      console.error("[proxy] SESSION_SECRET is not set in production — denying all proxy requests");
      return false;
    }
    return true; // dev-open mode
  }
  const cookieStore = await cookies();
  const token = cookieStore.get("0x01_session")?.value;
  return !!token && verifySession(token);
}

/**
 * Proxy requests to a node's HTTP API.
 * Solves mixed-content (HTTPS panel → HTTP node) for nodes without nginx.
 *
 * Usage: POST /api/proxy/node?ip=34.78.245.208&path=/envelopes/send
 * Body + Authorization header are forwarded as-is.
 */
export async function POST(req: NextRequest) {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ip = req.nextUrl.searchParams.get("ip");
  const path = req.nextUrl.searchParams.get("path");

  if (!ip || !ALLOWED_IPS.has(ip)) {
    return NextResponse.json({ error: "invalid ip" }, { status: 400 });
  }
  if (!path || !isAllowedPath(path)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const auth = req.headers.get("authorization") || "";
  const body = await req.text();

  try {
    const res = await fetch(`http://${ip}:8081${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "node unreachable" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ip = req.nextUrl.searchParams.get("ip");
  const path = req.nextUrl.searchParams.get("path");

  if (!ip || !ALLOWED_IPS.has(ip)) {
    return NextResponse.json({ error: "invalid ip" }, { status: 400 });
  }
  if (!path || !isAllowedPath(path)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const auth = req.headers.get("authorization") || "";

  try {
    const res = await fetch(`http://${ip}:8081${path}`, {
      headers: auth ? { Authorization: auth } : {},
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "node unreachable" }, { status: 502 });
  }
}
