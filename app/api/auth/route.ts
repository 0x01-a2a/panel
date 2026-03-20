import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { makeToken, verifySession } from "@/app/lib/session";

const ADMIN_USER = process.env.ADMIN_USER || "dev@legatia.solutions";
const ADMIN_PASS = process.env.ADMIN_PASS || "";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password } = body;

  if (!ADMIN_PASS) {
    return NextResponse.json(
      { error: "ADMIN_PASS not configured on server" },
      { status: 500 }
    );
  }

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = makeToken(username);
  const cookieStore = await cookies();
  cookieStore.set("0x01_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("0x01_session");
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("0x01_session")?.value;
  if (!token || !verifySession(token)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}
