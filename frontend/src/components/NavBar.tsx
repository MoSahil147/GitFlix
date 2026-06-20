import React from "react";

interface NavBarProps {
  contextual?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function NavBar({ contextual, actions }: NavBarProps) {
  return (
    <>
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }} />
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 48px", borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, zIndex: 10,
        background: "#050308ee", backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, letterSpacing: -0.5, color: "var(--text)" }}>
            GitFlix
          </span>
          {contextual && (
            <>
              <div style={{ width: 1, height: 14, background: "var(--border-dim)" }} />
              {contextual}
            </>
          )}
        </div>
        {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
      </nav>
    </>
  );
}
