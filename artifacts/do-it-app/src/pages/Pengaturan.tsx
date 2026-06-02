import { useState } from "react";
import { useTheme, THEMES, Theme } from "../contexts/ThemeContext";

export default function Pengaturan() {
  const { theme, setTheme } = useTheme();
  const [institution, setInstitution] = useState(() => localStorage.getItem("doitInstitution") || "");
  const [saved, setSaved] = useState(false);

  function saveInstitution() {
    localStorage.setItem("doitInstitution", institution);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#0a1628" }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(160deg,#05111f,#0d1f3c)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "20px 16px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ color: "#f1f5f9", fontWeight: 900, fontSize: 20, margin: 0 }}>⚙️ Pengaturan</h1>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "3px 0 0" }}>Konfigurasi & Personalisasi</p>
          </div>
          <div style={{
            background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: 10, padding: "4px 12px",
          }}>
            <span style={{ color: "#fbbf24", fontSize: 9, fontWeight: 800, letterSpacing: 1.5 }}>PREMIUM</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Tema & Skin */}
        <Section title="🎨 Tema & Skin" desc="Pilih tampilan visual aplikasi">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(Object.keys(THEMES) as Theme[]).map(k => {
              const th = THEMES[k];
              const active = theme === k;
              return (
                <button key={k} onClick={() => setTheme(k)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 14, border: active ? "1.5px solid rgba(96,165,250,0.5)" : "1px solid rgba(255,255,255,0.06)",
                    background: active ? "rgba(36,120,212,0.12)" : "rgba(255,255,255,0.03)",
                    cursor: "pointer", transition: "all 0.2s", textAlign: "left",
                  }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: th.header,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
                    border: active ? "2px solid rgba(96,165,250,0.4)" : "2px solid transparent",
                  }}>{th.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: active ? "#60a5fa" : "#e2e8f0" }}>{th.label}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                      {k === "default" ? "Navy biru, tampilan profesional" : k === "dark" ? "Gelap total, nyaman malam hari" : "Warna cerah bergaya komik"}
                    </div>
                  </div>
                  {active && (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#2478d4,#60a5fa)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Institusi */}
        <Section title="🏫 Layar Sambutan Branded" desc="Nama institusi tampil di splash screen">
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={institution} onChange={e => setInstitution(e.target.value)}
              placeholder="cth: POLINEMA – Kelas A"
              style={{
                flex: 1, borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 600,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#e2e8f0", outline: "none",
              }}
            />
            <button onClick={saveInstitution} style={{
              padding: "10px 16px", borderRadius: 12, fontWeight: 800, fontSize: 12,
              background: saved ? "linear-gradient(135deg,#14532d,#16a34a)" : "linear-gradient(135deg,#1e3a8a,#2478d4)",
              color: "#fff", border: "none", cursor: "pointer", flexShrink: 0, minWidth: 72,
            }}>
              {saved ? "✓ Tersimpan" : "Simpan"}
            </button>
          </div>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 8 }}>
            Nama ini muncul di splash screen setiap kali aplikasi dibuka.
          </p>
        </Section>

        {/* Tentang */}
        <Section title="ℹ️ Tentang Aplikasi" desc="">
          {[
            { icon: "🎮", label: "Versi Aplikasi",    value: "2.0 Premium" },
            { icon: "🏢", label: "Dikembangkan oleh", value: "POLINEMA × Comic Cafe" },
            { icon: "📚", label: "Untuk",              value: "Edukasi Kewirausahaan" },
            { icon: "💎", label: "UI Pack",            value: "ASA Production" },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>{item.value}</span>
            </div>
          ))}
        </Section>

      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "8px 16px 20px" }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.1)", letterSpacing: 2.5, textTransform: "uppercase" }}>
          POLINEMA × COMIC CAFE © 2025 · UI PACK BY ASA PRODUCTION
        </span>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 18, overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 16px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ fontWeight: 900, fontSize: 13, color: "#e2e8f0" }}>{title}</div>
        {desc && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}
