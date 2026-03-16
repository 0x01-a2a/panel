"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Login failed");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-[var(--border)] bg-[var(--card)] rounded p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-[13px] font-bold tracking-[4px] text-[var(--green)] mb-2">
            0x01 CONTROL
          </h1>
          <p className="text-[10px] tracking-[2px] text-[var(--sub)]">
            ADMIN ACCESS
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[9px] tracking-[3px] text-[var(--sub)] block mb-1">
              USERNAME
            </label>
            <input
              type="email"
              autoComplete="username"
              autoFocus
              required
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2.5 text-[12px] text-[var(--text)] placeholder:text-[var(--dim)] focus:border-[var(--green)] focus:outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="email"
            />
          </div>

          <div>
            <label className="text-[9px] tracking-[3px] text-[var(--sub)] block mb-1">
              PASSWORD
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2.5 text-[12px] text-[var(--text)] placeholder:text-[var(--dim)] focus:border-[var(--green)] focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-[11px] text-[var(--red)] border border-[var(--red)]/30 bg-[var(--red)]/5 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-[var(--green)] text-black font-bold text-[11px] tracking-[3px] py-3 rounded hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "AUTHENTICATING..." : "LOGIN"}
          </button>
        </div>
      </form>
    </div>
  );
}
