import React from "react";

interface NavBarProps {
  contextual?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function NavBar({ contextual, actions }: NavBarProps) {
  return (
    <header>
      <div aria-hidden="true" style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }} />
      <nav aria-label="Main" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 48px", borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, zIndex: 10,
        background: "#050308ee", backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/" aria-label="GitFlix home" title="Go to GitFlix home" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, letterSpacing: -0.5, color: "var(--text)" }}>
              Git<span style={{ color: "var(--accent)" }}>Flix</span>
            </span>
          </a>
          {contextual && (
            <>
              <div aria-hidden="true" style={{ width: 1, height: 14, background: "var(--border-dim)" }} />
              {contextual}
            </>
          )}
        </div>
        {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
      </nav>
    </header>
  );
}
