import { NextRequest, NextResponse } from "next/server";

// Server-side verification avoids CORS issues entirely — the server
// talks to the node directly, then issues a session to the browser.
export async function POST(req: NextRequest) {
  let nodeUrl: string;
  let secret: string;

  try {
    const body = await req.json();
    nodeUrl = (body.nodeUrl as string)?.trim().replace(/\/$/, "");
    secret = (body.secret as string)?.trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!nodeUrl || !secret) {
    return NextResponse.json({ error: "nodeUrl and secret required" }, { status: 400 });
  }

  // Verify credentials against the node's /identity endpoint.
  let identity: { agent_id?: string; name?: string } | null = null;
  try {
    const r = await fetch(`${nodeUrl}/identity`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) {
      return NextResponse.json(
        { error: "Node rejected credentials. Check your API secret." },
        { status: 401 }
      );
    }
    identity = await r.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("fetch") || msg.includes("connect") || msg.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { error: "Cannot reach node. Make sure it is running and the URL is correct." },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "Connection failed." }, { status: 502 });
  }

  if (!identity?.agent_id) {
    return NextResponse.json({ error: "Node returned no agent identity." }, { status: 502 });
  }

  return NextResponse.json({
    agent_id: identity.agent_id,
    name: identity.name ?? null,
    node_url: nodeUrl,
  });
}
