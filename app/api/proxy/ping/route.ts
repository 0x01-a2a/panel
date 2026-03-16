import { NextRequest, NextResponse } from "next/server";
import { NODES } from "@/app/lib/types";

const ALLOWED_IPS = new Set(NODES.map((n) => n.ip));
const API_NODES = new Set(NODES.filter((n) => n.nodeUrl).map((n) => n.ip));

export async function GET(req: NextRequest) {
  const ip = req.nextUrl.searchParams.get("ip");
  if (!ip || !ALLOWED_IPS.has(ip)) {
    return NextResponse.json({ error: "invalid ip" }, { status: 400 });
  }

  const start = Date.now();

  if (API_NODES.has(ip)) {
    // Nodes with REST API: hit /hosted/ping on 8081
    try {
      const res = await fetch(`http://${ip}:8081/hosted/ping`, {
        signal: AbortSignal.timeout(5000),
      });
      const rttMs = Date.now() - start;
      return NextResponse.json({ ok: res.ok, rttMs });
    } catch {
      return NextResponse.json({ ok: false, rttMs: -1 });
    }
  }

  // Relay-only nodes: HTTP fetch to libp2p port 9000
  // libp2p will accept the TCP connection but return non-HTTP data
  // A connection + any response (even an error) means the node is alive
  try {
    await fetch(`http://${ip}:9000/`, {
      signal: AbortSignal.timeout(5000),
    });
    // If we get here, it responded with valid HTTP (unlikely for libp2p)
    const rttMs = Date.now() - start;
    return NextResponse.json({ ok: true, rttMs });
  } catch (e: unknown) {
    const rttMs = Date.now() - start;
    // If it connected but returned garbage (not valid HTTP), fetch throws
    // but the connection was established — node is alive
    // Timeout or ECONNREFUSED means truly offline
    const msg = e instanceof Error ? e.message : "";
    if (rttMs < 4900 && !msg.includes("ECONNREFUSED") && !msg.includes("ENETUNREACH")) {
      // Connected but got non-HTTP response = node is alive
      return NextResponse.json({ ok: true, rttMs });
    }
    return NextResponse.json({ ok: false, rttMs: -1 });
  }
}
