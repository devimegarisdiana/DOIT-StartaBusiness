import { useState } from "react";
import { useTheme, THEMES, Theme } from "../contexts/ThemeContext";

export default function Pengaturan() {
  const { theme, setTheme } = useTheme();
  const [institution, setInstitution] = useState(() => localStorage.getItem("doitInstitution") || "");
  const [saved, setSaved] = useState(false);

  const t = THEMES[theme];

  function saveInstitution() {
    localStorage.setItem("doitInstitution", institution);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const isDark = theme === "dark";

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: isDark ? "#0a1628" : t.bg }}>

      {/* Header */}
      <div style={{
        background: isDark ? "linear-gradient(160deg,#05111f,#0d1f3c)" : `linear-gradient(135deg, ${t.header}, #2478d4)`,
        padding: "20px 16px 20px",
        borderRadius: "0 0 28px 28px",
      }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ color:"#fff", fontWeight:900, fontSize:22, margin:0 }}>⚙️ Pengaturan</h1>
            <p style={{ color:"rgba(255,255,255,0.6)", fontSize:11, margin:"3px 0 0" }}>Konfigurasi & Personalisasi</p>
          </div>
          <div style={{
            background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)",
            borderRadius:10, padding:"5px 12px", backdropFilter:"blur(10px)",
          }}>
            <span style={{ color:"#fff", fontSize:9, fontWeight:800, letterSpacing:1.5 }}>✨ PREMIUM</span>
          </div>
        </div>
      </div>

      <div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:14 }}>

        {/* Tema & Skin */}
        <Card title="🎨 Tema & Skin" desc="Pilih tampilan visual aplikasi" isDark={isDark} t={t}>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {(Object.keys(THEMES) as Theme[]).map(k => {
              const th = THEMES[k];
              const active = theme === k;
              return (
                <button key={k} onClick={() => setTheme(k)}
                  style={{
                    display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                    borderRadius:14,
                    border: active ? `2px solid ${th.accent}` : `1.5px solid ${isDark ? "rgba(255,255,255,0.06)" : t.border}`,
                    background: active ? `${th.accent}14` : isDark ? "rgba(255,255,255,0.03)" : t.bg,
                    cursor:"pointer", transition:"all 0.2s", textAlign:"left",
                  }}>
                  <div style={{
                    width:38, height:38, borderRadius:11, background: th.header,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0,
                    border: active ? `2px solid ${th.accent}` : "2px solid transparent",
                    boxShadow: active ? `0 4px 12px ${th.accent}40` : "none",
                  }}>{th.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:13, color: active ? th.accent : (isDark ? "#e2e8f0" : t.text) }}>{th.label}</div>
                    <div style={{ fontSize:10, color: isDark ? "rgba(255,255,255,0.3)" : t.subtext, marginTop:1 }}>
                      {k === "default" ? "Navy biru, tampilan profesional" : k === "dark" ? "Gelap total, nyaman malam hari" : "Warna cerah bergaya komik"}
                    </div>
                  </div>
                  {active && (
                    <div style={{
                      width:22, height:22, borderRadius:"50%", background:`linear-gradient(135deg,${th.header},${th.accent})`,
                      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                    }}>
                      <span style={{ color:"#fff", fontSize:11, fontWeight:900 }}>✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Institusi */}
        <Card title="🏫 Layar Sambutan Branded" desc="Nama institusi tampil di splash screen" isDark={isDark} t={t}>
          <div style={{ display:"flex", gap:8 }}>
            <input
              value={institution} onChange={e => setInstitution(e.target.value)}
              placeholder="cth: POLINEMA – Kelas A"
              style={{
                flex:1, borderRadius:12, padding:"10px 14px", fontSize:13, fontWeight:600,
                background: isDark ? "rgba(255,255,255,0.05)" : t.bg,
                border: `1.5px solid ${isDark ? "rgba(255,255,255,0.1)" : t.border}`,
                color: isDark ? "#e2e8f0" : t.text, outline:"none",
              }}
            />
            <button onClick={saveInstitution} style={{
              padding:"10px 16px", borderRadius:12, fontWeight:800, fontSize:12,
              background: saved ? "linear-gradient(135deg,#14532d,#16a34a)" : `linear-gradient(135deg,${t.header},${t.accent})`,
              color:"#fff", border:"none", cursor:"pointer", flexShrink:0, minWidth:72,
              boxShadow: saved ? "0 4px 12px rgba(22,163,74,0.3)" : `0 4px 12px ${t.accent}40`,
            }}>
              {saved ? "✓ OK" : "Simpan"}
            </button>
          </div>
          <p style={{ fontSize:10, color: isDark ? "rgba(255,255,255,0.25)" : t.subtext, marginTop:8 }}>
            Nama ini muncul di splash screen setiap kali aplikasi dibuka.
          </p>
        </Card>

        {/* Tentang */}
        <Card title="ℹ️ Tentang Aplikasi" desc="" isDark={isDark} t={t}>
          {[
            { icon:"🎮", label:"Versi Aplikasi",    value:"2.0 Premium" },
            { icon:"🏢", label:"Dikembangkan oleh", value:"POLINEMA × Comic Cafe" },
            { icon:"📚", label:"Untuk",              value:"Edukasi Kewirausahaan" },
            { icon:"💎", label:"UI Pack",            value:"DMAFORGE" },
          ].map((item, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"10px 0", borderBottom: i < 3 ? `1px solid ${isDark ? "rgba(255,255,255,0.05)" : t.border}` : "none",
            }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <span style={{ flex:1, fontSize:12, color: isDark ? "rgba(255,255,255,0.4)" : t.subtext }}>{item.label}</span>
              <span style={{ fontSize:12, fontWeight:700, color: isDark ? "#94a3b8" : t.text }}>{item.value}</span>
            </div>
          ))}
        </Card>

      </div>

      {/* Footer */}
      <div style={{ textAlign:"center", padding:"4px 16px 20px" }}>
        <span style={{ fontSize:9, color: isDark ? "rgba(255,255,255,0.1)" : "#94a3b8", letterSpacing:2.5, textTransform:"uppercase" }}>
          POLINEMA × COMIC CAFE © 2025 · UI PACK BY DMAFORGE
        </span>
      </div>
    </div>
  );
}

function Card({ title, desc, children, isDark, t }: {
  title: string; desc: string; children: React.ReactNode;
  isDark: boolean; t: typeof THEMES[keyof typeof THEMES];
}) {
  return (
    <div style={{
      background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
      border: `1.5px solid ${isDark ? "rgba(255,255,255,0.07)" : t.border}`,
      borderRadius:20, overflow:"hidden",
      boxShadow: isDark ? "none" : "0 2px 12px rgba(36,120,212,0.07)",
    }}>
      <div style={{ padding:"14px 16px 10px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : t.border}` }}>
        <div style={{ fontWeight:900, fontSize:14, color: isDark ? "#e2e8f0" : t.text }}>{title}</div>
        {desc && <div style={{ fontSize:10, color: isDark ? "rgba(255,255,255,0.25)" : t.subtext, marginTop:2 }}>{desc}</div>}
      </div>
      <div style={{ padding:"14px 16px" }}>{children}</div>
    </div>
  );
}
