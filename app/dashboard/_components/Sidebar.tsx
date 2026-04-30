"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "../_lib/api";

const NAV = [
  { href: "/dashboard/overview", label: "Overview",  icon: IconHome },
  { href: "/dashboard/wallet",   label: "Wallet",    icon: IconWallet },
  { href: "/dashboard/jobs",     label: "Jobs",      icon: IconBriefcase },
  { href: "/dashboard/token",    label: "Token",     icon: IconCoin },
  { href: "/dashboard/settings", label: "Settings",  icon: IconGear },
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  function handleSignOut() {
    clearSession();
    router.push("/dashboard/login");
  }

  return (
    <nav className="d-sidebar">
      <div className="d-sidebar-logo">
        <div className="d-logo-mark">
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "#000" }}>
            01
          </span>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--d-text)", lineHeight: 1.2 }}>
            0x01
          </div>
          <div style={{ fontSize: 9.5, color: "var(--d-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Agent Dashboard
          </div>
        </div>
      </div>

      <div className="d-nav">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`d-nav-item ${path.startsWith(href) ? "d-nav-active" : ""}`}>
            <Icon />
            {label}
          </Link>
        ))}
      </div>

      <div className="d-sidebar-footer">
        <button
          onClick={handleSignOut}
          style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--d-muted)", fontSize: 12, padding: 0, width: "100%", transition: "color 0.12s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--d-text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--d-muted)")}
        >
          <IconLogout />
          Sign out
        </button>
      </div>
    </nav>
  );
}

function IconHome() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1.5 6.5L7.5 1.5L13.5 6.5V13H9.5V9.5H5.5V13H1.5V6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

function IconWallet() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1 6.5h13" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="10.5" cy="9.5" r="1" fill="currentColor"/>
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 5V3.5C5 2.67 5.67 2 6.5 2h2C9.33 2 10 2.67 10 3.5V5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M1 9h13" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}

function IconCoin() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7.5 4v7M5.5 5.2C5.5 4.8 6 4.3 7.5 4.3s2 .5 2 1.4S7.5 7 7.5 7.7s2 .9 2 2-1 1.6-2 1.6-2-.5-2-1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7.5" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7.5 1.5v1.7M7.5 11.8v1.7M1.5 7.5h1.7M11.8 7.5h1.7M3.3 3.3l1.2 1.2M10.5 10.5l1.2 1.2M3.3 11.7l1.2-1.2M10.5 4.5l1.2-1.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h3M9 9.5l3-3-3-3M12 6.5H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
