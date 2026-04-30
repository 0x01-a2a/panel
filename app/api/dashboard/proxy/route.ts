import { NextRequest, NextResponse } from "next/server";

// Proxy all dashboard→node requests server-side so browsers never make
// direct cross-origin calls to localhost / private IPs.
//
// Usage (client):
//   POST /api/dashboard/proxy
//   Headers: x-node-url: http://localhost:9090
//            x-node-token: <bearer token>
//   Body: { path: "/tasks/log?limit=20", method: "GET" }
//      or { path: "/agent/persona/write", method: "POST", body: "..." }

const DENIED_PREFIXES = [
  "/admin",
  "/internal",
];

function isAllowedPath(path: string): boolean {
  const p = path.split("?")[0];
  if (DENIED_PREFIXES.some((d) => p.startsWith(d))) return false;
  return true;
}

async function proxy(req: NextRequest, method: string): Promise<NextResponse> {
  const nodeUrl = req.headers.get("x-node-url");
  const nodeToken = req.headers.get("x-node-token");

  if (!nodeUrl || !nodeToken) {
    return NextResponse.json({ error: "missing x-node-url or x-node-token" }, { status: 400 });
  }

  // Validate node URL is HTTP/HTTPS and not an obviously dangerous target
  try {
    const u = new URL(nodeUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return NextResponse.json({ error: "invalid node url protocol" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "invalid node url" }, { status: 400 });
  }

  let path = "/";
  let forwardBody: string | undefined;
  let forwardMethod = method;

  if (method === "POST" || method === "DELETE") {
    const body = await req.json().catch(() => ({}));
    path = body.path ?? "/";
    forwardMethod = body.method ?? method;
    forwardBody = body.body;
  } else {
    path = req.nextUrl.searchParams.get("path") ?? "/";
  }

  if (!isAllowedPath(path)) {
    return NextResponse.json({ error: "path not allowed" }, { status: 403 });
  }

  const target = `${nodeUrl.replace(/\/$/, "")}${path}`;

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${nodeToken}`,
    };
    if (forwardBody !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(target, {
      method: forwardMethod,
      headers,
      body: forwardBody,
      signal: AbortSignal.timeout(15000),
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ error: "node unreachable", detail: String(e) }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  return proxy(req, "GET");
}

export async function POST(req: NextRequest) {
  return proxy(req, "POST");
}

export async function DELETE(req: NextRequest) {
  return proxy(req, "DELETE");
}
